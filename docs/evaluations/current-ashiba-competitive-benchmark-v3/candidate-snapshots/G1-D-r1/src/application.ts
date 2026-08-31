import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { bigint, integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
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

const tickets = pgTable('tickets', {
  id: bigint('id', { mode: 'bigint' }).primaryKey().generatedAlwaysAsIdentity(),
  title: text('title').notNull(),
  status: text('status').$type<TicketStatus>().notNull(),
  assignee: text('assignee'),
  priority: integer('priority').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull(),
});

const ticketAudit = pgTable('ticket_audit', {
  ticketId: bigint('ticket_id', { mode: 'bigint' }).notNull(),
  action: text('action').notNull(),
  detail: text('detail').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull(),
});

const ticketStatuses = new Set<TicketStatus>(['open', 'pending', 'closed']);
const ticketSorts = new Set<TicketSort>(['id', 'priority', 'createdAt']);
const directions = new Set<SortDirection>(['asc', 'desc']);
const maxBigint = 9_223_372_036_854_775_807n;

class CandidateError extends Error implements ApplicationError {
  readonly code: ApplicationError['code'];

  constructor(code: ApplicationError['code'], message: string) {
    super(message);
    this.name = 'ApplicationError';
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

function validation(message: string): never {
  throw new CandidateError('VALIDATION', message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function positiveIdentifier(value: unknown, field: string): bigint {
  if (typeof value !== 'string' || !/^[0-9]+$/.test(value)) {
    return validation(`${field} must be a positive base-10 integer string`);
  }

  const parsed = BigInt(value);
  if (parsed <= 0n || parsed > maxBigint) {
    return validation(`${field} must be a positive PostgreSQL bigint string`);
  }

  return parsed;
}

function ticketStatus(value: unknown): TicketStatus {
  if (typeof value !== 'string' || !ticketStatuses.has(value as TicketStatus)) {
    return validation('status is unsupported');
  }
  return value as TicketStatus;
}

function ticketSort(value: unknown): TicketSort {
  if (typeof value !== 'string' || !ticketSorts.has(value as TicketSort)) {
    return validation('sort is unsupported');
  }
  return value as TicketSort;
}

function sortDirection(value: unknown): SortDirection {
  if (typeof value !== 'string' || !directions.has(value as SortDirection)) {
    return validation('direction is unsupported');
  }
  return value as SortDirection;
}

function boundedInteger(value: unknown, fallback: number, minimum: number, maximum: number, field: string): number {
  if (value === undefined) {
    return fallback;
  }
  if (typeof value !== 'number' || !Number.isInteger(value) || value < minimum || value > maximum) {
    return validation(`${field} must be an integer from ${minimum} through ${maximum}`);
  }
  return value;
}

function optionalAssignee(value: unknown, field: string): string | null {
  if (value === null || typeof value === 'string') {
    return value;
  }

  return validation(`${field} must be a string or null`);
}

function copyMetadata(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    return validation('metadata must be a JSON object');
  }

  try {
    const serialized = JSON.stringify(value);
    if (serialized === undefined) {
      return validation('metadata must be JSON-safe');
    }
    const copied: unknown = JSON.parse(serialized);
    if (!isRecord(copied)) {
      return validation('metadata must be a JSON object');
    }
    return copied;
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
    createdAt: new Date(row.createdAt).toISOString(),
    metadata: copyMetadata(row.metadata),
  };
}

function requireInput(value: unknown, operation: string): Record<string, unknown> {
  if (!isRecord(value)) {
    return validation(`${operation} input must be an object`);
  }
  return value;
}

export function createApplication(runtime: Runtime): Application {
  const pool = new Pool({ connectionString: runtime.connectionString });
  const db = drizzle({ client: pool });
  let closed = false;
  let closePromise: Promise<void> | undefined;

  const assertOpen = (): void => {
    if (closed) {
      throw new CandidateError('APPLICATION_CLOSED', 'application is closed');
    }
  };

  return {
    async list(input) {
      assertOpen();
      const request = input === undefined ? {} : requireInput(input, 'list');
      const status = request.status === undefined ? undefined : ticketStatus(request.status);
      const assignee = request.assignee === undefined ? undefined : optionalAssignee(request.assignee, 'assignee');
      const sort = request.sort === undefined ? 'id' : ticketSort(request.sort);
      const direction = request.direction === undefined ? 'asc' : sortDirection(request.direction);
      const offset = boundedInteger(request.offset, 0, 0, 10_000, 'offset');
      const limit = boundedInteger(request.limit, 100, 1, 100, 'limit');

      const conditions = [];
      if (status !== undefined) {
        conditions.push(eq(tickets.status, status));
      }
      if (assignee !== undefined) {
        conditions.push(assignee === null ? isNull(tickets.assignee) : eq(tickets.assignee, assignee));
      }

      const sortColumn = sort === 'id'
        ? tickets.id
        : sort === 'priority'
          ? tickets.priority
          : tickets.createdAt;
      const primaryOrder = direction === 'asc' ? asc(sortColumn) : desc(sortColumn);
      const rows = await db
        .select()
        .from(tickets)
        .where(and(...conditions))
        .orderBy(primaryOrder, asc(tickets.id))
        .offset(offset)
        .limit(limit);

      return rows.map(toTicket);
    },

    async get(input) {
      assertOpen();
      const request = requireInput(input, 'get');
      const id = positiveIdentifier(request.id, 'id');
      const [row] = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1);
      return row === undefined ? null : toTicket(row);
    },

    async create(input) {
      assertOpen();
      const request = requireInput(input, 'create');
      if (typeof request.title !== 'string') {
        validation('title must be a string');
      }
      const status = ticketStatus(request.status);
      const assignee = optionalAssignee(request.assignee, 'assignee');
      if (typeof request.priority !== 'number' || !Number.isInteger(request.priority) || request.priority < 1 || request.priority > 5) {
        validation('priority must be an integer from 1 through 5');
      }
      const metadata = request.metadata === undefined ? {} : copyMetadata(request.metadata);
      const [row] = await db
        .insert(tickets)
        .values({
          title: request.title,
          status,
          assignee,
          priority: request.priority,
          createdAt: new Date().toISOString(),
          metadata,
        })
        .returning();

      if (row === undefined) {
        throw new Error('ticket insert did not return a row');
      }
      return toTicket(row);
    },

    async assign(input) {
      assertOpen();
      const request = requireInput(input, 'assign');
      const id = positiveIdentifier(request.id, 'id');
      const assignee = optionalAssignee(request.assignee, 'assignee');

      return db.transaction(async (tx) => {
        const [updated] = await tx
          .update(tickets)
          .set({ assignee })
          .where(eq(tickets.id, id))
          .returning({ id: tickets.id, assignee: tickets.assignee });

        if (updated === undefined) {
          throw new CandidateError('NOT_FOUND', 'ticket was not found');
        }

        await tx.insert(ticketAudit).values({
          ticketId: id,
          action: 'assign',
          detail: JSON.stringify({ assignee }),
          createdAt: new Date().toISOString(),
        });

        return { id: updated.id.toString(), assignee: updated.assignee };
      });
    },

    async close() {
      if (closePromise === undefined) {
        closed = true;
        closePromise = pool.end();
      }
      await closePromise;
    },
  };
}
