import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import { bigint, integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

export type TicketStatus = 'open' | 'pending' | 'closed';
export type TicketSort = 'id' | 'priority' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

export interface Runtime {
  connectionString: string;
  schema: string;
}

export interface Ticket {
  id: string;
  title: string;
  status: TicketStatus;
  assignee: string | null;
  priority: number;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export interface ApplicationError extends Error {
  code: 'VALIDATION' | 'NOT_FOUND' | 'INSUFFICIENT_FUNDS' | 'APPLICATION_CLOSED';
}

export interface Application {
  list(input?: {
    status?: TicketStatus;
    assignee?: string | null;
    sort?: TicketSort;
    direction?: SortDirection;
    offset?: number;
    limit?: number;
  }): Promise<Ticket[]>;
  get(input: { id: string }): Promise<Ticket | null>;
  create(input: {
    title: string;
    status: TicketStatus;
    assignee: string | null;
    priority: number;
    metadata?: Record<string, unknown>;
  }): Promise<Ticket>;
  assign(input: { id: string; assignee: string | null }): Promise<{ id: string; assignee: string | null }>;
  close(): Promise<void>;
}

// The candidate role's search_path is the runner-provisioned nonce schema, so
// these unqualified Drizzle tables resolve only within that schema.
const tickets = pgTable('tickets', {
  id: bigint({ mode: 'bigint' }).primaryKey().generatedAlwaysAsIdentity(),
  title: text().notNull(),
  status: text().$type<TicketStatus>().notNull(),
  assignee: text(),
  priority: integer().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
  metadata: jsonb().$type<Record<string, unknown>>().notNull(),
});

const ticketAudit = pgTable('ticket_audit', {
  auditId: bigint('audit_id', { mode: 'bigint' }).primaryKey().generatedAlwaysAsIdentity(),
  ticketId: bigint('ticket_id', { mode: 'bigint' }).notNull(),
  action: text().notNull(),
  detail: text().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
});

const ticketStatuses = new Set<TicketStatus>(['open', 'pending', 'closed']);
const ticketSorts = new Set<TicketSort>(['id', 'priority', 'createdAt']);
const sortDirections = new Set<SortDirection>(['asc', 'desc']);
const maxBigint = 9_223_372_036_854_775_807n;

function applicationError(code: ApplicationError['code'], message: string): ApplicationError {
  const error = new Error(message) as ApplicationError;
  error.code = code;
  return error;
}

function validation(message: string): never {
  throw applicationError('VALIDATION', message);
}

function parsePositiveId(value: unknown, name: string): bigint {
  if (typeof value !== 'string' || !/^[1-9][0-9]*$/.test(value)) {
    return validation(`${name} must be a positive base-10 integer string`);
  }

  const parsed = BigInt(value);
  if (parsed > maxBigint) {
    return validation(`${name} is outside PostgreSQL bigint range`);
  }
  return parsed;
}

function requireStatus(value: unknown): TicketStatus {
  if (typeof value !== 'string' || !ticketStatuses.has(value as TicketStatus)) {
    return validation('status must be open, pending, or closed');
  }
  return value as TicketStatus;
}

function requireAssignee(value: unknown): string | null {
  if (value !== null && typeof value !== 'string') {
    return validation('assignee must be a string or null');
  }
  return value;
}

function requirePriority(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 5) {
    return validation('priority must be an integer from 1 through 5');
  }
  return value;
}

function requirePageNumber(value: unknown, name: 'offset' | 'limit', minimum: number, maximum: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < minimum || value > maximum) {
    return validation(`${name} must be an integer from ${minimum} through ${maximum}`);
  }
  return value;
}

function jsonObject(value: unknown): Record<string, unknown> {
  if (value === undefined) {
    return {};
  }
  if (value === null || Array.isArray(value) || typeof value !== 'object') {
    return validation('metadata must be a JSON object');
  }

  try {
    const encoded = JSON.stringify(value);
    if (encoded === undefined) {
      return validation('metadata must be JSON-safe');
    }
    const parsed: unknown = JSON.parse(encoded);
    if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') {
      return validation('metadata must be a JSON object');
    }
    return parsed as Record<string, unknown>;
  } catch {
    return validation('metadata must be JSON-safe');
  }
}

function toTicket(row: typeof tickets.$inferSelect): Ticket {
  return {
    id: row.id.toString(),
    title: row.title,
    status: row.status,
    assignee: row.assignee,
    priority: row.priority,
    createdAt: row.createdAt.toISOString(),
    metadata: jsonObject(row.metadata),
  };
}

export function createApplication(runtime: Runtime): Application {
  const pool = new Pool({ connectionString: runtime.connectionString });
  const db = drizzle(pool);
  let closed = false;
  let closePromise: Promise<void> | undefined;

  function ensureOpen(): void {
    if (closed) {
      throw applicationError('APPLICATION_CLOSED', 'application is closed');
    }
  }

  return {
    async list(input = {}): Promise<Ticket[]> {
      ensureOpen();
      if (input === null || typeof input !== 'object' || Array.isArray(input)) {
        return validation('list input must be an object');
      }

      const status = input.status === undefined ? undefined : requireStatus(input.status);
      const assignee = input.assignee === undefined ? undefined : requireAssignee(input.assignee);
      const sort = input.sort ?? 'id';
      const direction = input.direction ?? 'asc';
      const offset = input.offset === undefined ? 0 : requirePageNumber(input.offset, 'offset', 0, 10_000);
      const limit = input.limit === undefined ? 100 : requirePageNumber(input.limit, 'limit', 1, 100);

      if (!ticketSorts.has(sort)) validation('sort must be id, priority, or createdAt');
      if (!sortDirections.has(direction)) validation('direction must be asc or desc');

      const conditions = [];
      if (status !== undefined) conditions.push(eq(tickets.status, status));
      if (assignee === null) conditions.push(isNull(tickets.assignee));
      else if (assignee !== undefined) conditions.push(eq(tickets.assignee, assignee));

      const columns = {
        id: tickets.id,
        priority: tickets.priority,
        createdAt: tickets.createdAt,
      };
      const primaryOrder = direction === 'asc' ? asc(columns[sort]) : desc(columns[sort]);
      const rows = await db
        .select()
        .from(tickets)
        .where(conditions.length === 0 ? undefined : and(...conditions))
        .orderBy(primaryOrder, asc(tickets.id))
        .offset(offset)
        .limit(limit);

      return rows.map(toTicket);
    },

    async get(input: { id: string }): Promise<Ticket | null> {
      ensureOpen();
      const id = parsePositiveId(input?.id, 'id');
      const [row] = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1);
      return row === undefined ? null : toTicket(row);
    },

    async create(input): Promise<Ticket> {
      ensureOpen();
      if (input === null || typeof input !== 'object' || typeof input.title !== 'string') {
        return validation('title must be a string');
      }

      const status = requireStatus(input.status);
      const assignee = requireAssignee(input.assignee);
      const priority = requirePriority(input.priority);
      const metadata = jsonObject(input.metadata);
      const [row] = await db
        .insert(tickets)
        .values({ title: input.title, status, assignee, priority, createdAt: new Date(), metadata })
        .returning();

      return toTicket(row);
    },

    async assign(input: { id: string; assignee: string | null }): Promise<{ id: string; assignee: string | null }> {
      ensureOpen();
      const id = parsePositiveId(input?.id, 'id');
      const assignee = requireAssignee(input?.assignee);

      return db.transaction(async (tx) => {
        const [updated] = await tx
          .update(tickets)
          .set({ assignee })
          .where(eq(tickets.id, id))
          .returning({ id: tickets.id, assignee: tickets.assignee });

        if (updated === undefined) {
          throw applicationError('NOT_FOUND', 'ticket was not found');
        }

        await tx.insert(ticketAudit).values({
          ticketId: id,
          action: 'assign',
          detail: JSON.stringify({ assignee }),
          createdAt: new Date(),
        });

        return { id: updated.id.toString(), assignee: updated.assignee };
      });
    },

    async close(): Promise<void> {
      if (!closed) {
        closed = true;
        closePromise = pool.end();
      }
      await closePromise;
    },
  };
}
