import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { bigint, integer as integerColumn, jsonb, pgSchema, text, timestamp } from 'drizzle-orm/pg-core';
import { Pool } from 'pg';

type TicketStatus = 'open' | 'pending' | 'closed';
type TicketSort = 'id' | 'priority' | 'createdAt';
type SortDirection = 'asc' | 'desc';

interface Runtime {
  connectionString: string;
  schema: string;
}

interface Ticket {
  id: string;
  title: string;
  status: TicketStatus;
  assignee: string | null;
  priority: number;
  createdAt: string;
  metadata: Record<string, unknown>;
}

type ApplicationErrorCode = 'VALIDATION' | 'NOT_FOUND' | 'APPLICATION_CLOSED';

function applicationError(code: ApplicationErrorCode, message: string): Error & { code: ApplicationErrorCode } {
  return Object.assign(new Error(message), { code });
}

function integer(value: unknown, name: string, minimum: number, maximum?: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < minimum || (maximum !== undefined && value > maximum)) {
    throw applicationError('VALIDATION', `${name} must be an integer in range`);
  }
  return value;
}

function positiveId(value: unknown, name: string): string {
  if (typeof value !== 'string' || !/^[1-9][0-9]*$/.test(value)) throw applicationError('VALIDATION', `${name} must be a positive integer string`);
  return value;
}

function status(value: unknown): TicketStatus {
  if (value !== 'open' && value !== 'pending' && value !== 'closed') throw applicationError('VALIDATION', 'status is invalid');
  return value;
}

function mapTicket(row: { id: string; title: string; status: TicketStatus; assignee: string | null; priority: number; createdAt: string; metadata: unknown }): Ticket {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    assignee: row.assignee,
    priority: row.priority,
    createdAt: row.createdAt,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
  };
}

/** Ordinary layered application entrypoint using Drizzle at the data boundary. */
export function createApplication(runtime: Runtime) {
  const pool = new Pool({ connectionString: runtime.connectionString, max: 4 });
  const db = drizzle(pool);
  const namespace = pgSchema(runtime.schema);
  const ticketStatus = namespace.enum('ticket_status', ['open', 'pending', 'closed']);
  const tickets = namespace.table('tickets', {
    id: bigint('id', { mode: 'string' }).primaryKey(),
    title: text('title').notNull(),
    status: ticketStatus('status').$type<TicketStatus>().notNull(),
    assignee: text('assignee'),
    priority: integerColumn('priority').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull(),
  });
  const ticketAudit = namespace.table('ticket_audit', {
    auditId: bigint('audit_id', { mode: 'string' }).primaryKey(),
    ticketId: bigint('ticket_id', { mode: 'string' }).notNull(),
    action: text('action').notNull(),
    detail: text('detail').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull(),
  });
  let closed = false;

  const ensureOpen = () => {
    if (closed) throw applicationError('APPLICATION_CLOSED', 'application is closed');
  };

  return {
    async list(input: { status?: TicketStatus; assignee?: string | null; sort?: TicketSort; direction?: SortDirection; offset?: number; limit?: number } = {}): Promise<Ticket[]> {
      ensureOpen();
      const sort = input.sort ?? 'id';
      const direction = input.direction ?? 'asc';
      const offset = integer(input.offset ?? 0, 'offset', 0, 10_000);
      const limit = integer(input.limit ?? 20, 'limit', 1, 100);
      if (sort !== 'id' && sort !== 'priority' && sort !== 'createdAt') throw applicationError('VALIDATION', 'sort is invalid');
      if (direction !== 'asc' && direction !== 'desc') throw applicationError('VALIDATION', 'direction is invalid');
      const predicates = [];
      if (input.status !== undefined) predicates.push(eq(tickets.status, status(input.status)));
      if (Object.hasOwn(input, 'assignee')) predicates.push(input.assignee === null ? isNull(tickets.assignee) : eq(tickets.assignee, input.assignee ?? ''));
      const selectedSort = sort === 'id' ? tickets.id : sort === 'priority' ? tickets.priority : tickets.createdAt;
      const ordering = direction === 'asc' ? asc(selectedSort) : desc(selectedSort);
      const rows = await db.select().from(tickets).where(predicates.length === 0 ? undefined : and(...predicates)).orderBy(ordering, asc(tickets.id)).limit(limit).offset(offset);
      return rows.map(mapTicket);
    },

    async get(input: { id: string }): Promise<Ticket | null> {
      ensureOpen();
      const id = positiveId(input?.id, 'id');
      const rows = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1);
      return rows[0] ? mapTicket(rows[0]) : null;
    },

    async create(input: { title: string; status: TicketStatus; assignee: string | null; priority: number; metadata?: Record<string, unknown> }): Promise<Ticket> {
      ensureOpen();
      if (!input || typeof input.title !== 'string' || input.title.length === 0 || (input.assignee !== null && typeof input.assignee !== 'string')) {
        throw applicationError('VALIDATION', 'ticket input is invalid');
      }
      const rows = await db.insert(tickets).values({
        title: input.title,
        status: status(input.status),
        assignee: input.assignee,
        priority: integer(input.priority, 'priority', 1, 5),
        createdAt: new Date().toISOString(),
        metadata: input.metadata ?? {},
      }).returning();
      return mapTicket(rows[0]!);
    },

    async assign(input: { id: string; assignee: string | null }): Promise<{ id: string; assignee: string | null }> {
      ensureOpen();
      const id = positiveId(input?.id, 'id');
      if (input.assignee !== null && typeof input.assignee !== 'string') throw applicationError('VALIDATION', 'assignee is invalid');
      return db.transaction(async (transaction) => {
        const rows = await transaction.update(tickets).set({ assignee: input.assignee }).where(eq(tickets.id, id)).returning({ id: tickets.id, assignee: tickets.assignee });
        const changed = rows[0];
        if (!changed) throw applicationError('NOT_FOUND', 'ticket does not exist');
        await transaction.insert(ticketAudit).values({
          ticketId: id,
          action: 'assigned',
          detail: JSON.stringify({ assignee: input.assignee }),
          createdAt: new Date().toISOString(),
        });
        return changed;
      });
    },

    async close(): Promise<void> {
      if (!closed) {
        closed = true;
        await pool.end();
      }
    },
  };
}
