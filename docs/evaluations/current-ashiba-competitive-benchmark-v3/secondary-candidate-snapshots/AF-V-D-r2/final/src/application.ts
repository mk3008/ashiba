import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { bigint, integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { Pool } from 'pg';

type TicketStatus = 'open' | 'pending' | 'closed';
type TicketSort = 'id' | 'priority' | 'createdAt';
type SortDirection = 'asc' | 'desc';
interface Runtime { connectionString: string; schema: string; }
interface Ticket { id: string; title: string; status: TicketStatus; assignee: string | null; priority: number; createdAt: string; metadata: Record<string, unknown>; }

const tickets = pgTable('tickets', {
  id: bigint('id', { mode: 'bigint' }).primaryKey().generatedAlwaysAsIdentity(), title: text('title').notNull(),
  status: text('status').$type<TicketStatus>().notNull(), assignee: text('assignee'), priority: integer('priority').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(), metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull(),
});
const ticketAudit = pgTable('ticket_audit', {
  auditId: bigint('audit_id', { mode: 'bigint' }).primaryKey().generatedAlwaysAsIdentity(), ticketId: bigint('ticket_id', { mode: 'bigint' }).notNull(),
  action: text('action').notNull(), detail: text('detail').notNull(), createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
});
function appError(code: 'VALIDATION' | 'NOT_FOUND' | 'APPLICATION_CLOSED'): Error & { code: typeof code } { return Object.assign(new Error(code), { code }); }
function positiveId(value: string): bigint { if (!/^\d+$/.test(value) || BigInt(value) <= 0n) throw appError('VALIDATION'); return BigInt(value); }
function bounded(value: unknown, fallback: number, min: number, max: number): number { if (value === undefined) return fallback; if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) throw appError('VALIDATION'); return value; }
function status(value: unknown): TicketStatus { if (value === 'open' || value === 'pending' || value === 'closed') return value; throw appError('VALIDATION'); }
function mapTicket(row: typeof tickets.$inferSelect): Ticket { return { id: row.id.toString(), title: row.title, status: row.status, assignee: row.assignee, priority: row.priority, createdAt: row.createdAt.toISOString(), metadata: row.metadata }; }

export function createApplication(runtime: Runtime) {
  const pool = new Pool({ connectionString: runtime.connectionString });
  const db = drizzle(pool);
  let closed = false;
  const open = () => { if (closed) throw appError('APPLICATION_CLOSED'); };
  const order = (sort: TicketSort, direction: SortDirection) => {
    if (sort === 'id') return direction === 'asc' ? asc(tickets.id) : desc(tickets.id);
    if (sort === 'priority') return direction === 'asc' ? asc(tickets.priority) : desc(tickets.priority);
    return direction === 'asc' ? asc(tickets.createdAt) : desc(tickets.createdAt);
  };
  return {
    async list(input: { status?: TicketStatus; assignee?: string | null; sort?: TicketSort; direction?: SortDirection; offset?: number; limit?: number } = {}): Promise<Ticket[]> {
      open(); if (input.status !== undefined) status(input.status); if (input.assignee !== undefined && input.assignee !== null && typeof input.assignee !== 'string') throw appError('VALIDATION');
      const sort = input.sort ?? 'id'; const direction = input.direction ?? 'asc'; if (!['id', 'priority', 'createdAt'].includes(sort) || !['asc', 'desc'].includes(direction)) throw appError('VALIDATION');
      const offset = bounded(input.offset, 0, 0, 10_000); const limit = bounded(input.limit, 100, 1, 100); const predicates = [];
      if (input.status !== undefined) predicates.push(eq(tickets.status, input.status)); if (input.assignee === null) predicates.push(isNull(tickets.assignee)); else if (typeof input.assignee === 'string') predicates.push(eq(tickets.assignee, input.assignee));
      const rows = await db.select().from(tickets).where(predicates.length === 0 ? undefined : and(...predicates)).orderBy(order(sort, direction), asc(tickets.id)).limit(limit).offset(offset);
      return rows.map(mapTicket);
    },
    async get(input: { id: string }): Promise<Ticket | null> { open(); const rows = await db.select().from(tickets).where(eq(tickets.id, positiveId(input?.id))).limit(1); return rows[0] ? mapTicket(rows[0]) : null; },
    async create(input: { title: string; status: TicketStatus; assignee: string | null; priority: number; metadata?: Record<string, unknown> }): Promise<Ticket> {
      open(); if (typeof input?.title !== 'string' || (typeof input.assignee !== 'string' && input.assignee !== null)) throw appError('VALIDATION'); const [row] = await db.insert(tickets).values({ title: input.title, status: status(input.status), assignee: input.assignee, priority: bounded(input.priority, 0, 1, 5), createdAt: new Date(), metadata: input.metadata ?? {} }).returning(); return mapTicket(row);
    },
    async assign(input: { id: string; assignee: string | null }): Promise<{ id: string; assignee: string | null }> {
      open(); const id = positiveId(input?.id); if (typeof input.assignee !== 'string' && input.assignee !== null) throw appError('VALIDATION'); return db.transaction(async (tx) => { const [updated] = await tx.update(tickets).set({ assignee: input.assignee }).where(eq(tickets.id, id)).returning(); if (!updated) throw appError('NOT_FOUND'); await tx.insert(ticketAudit).values({ ticketId: id, action: 'assigned', detail: input.assignee ?? 'unassigned', createdAt: new Date() }); return { id: updated.id.toString(), assignee: updated.assignee }; });
    },
    async close(): Promise<void> { if (!closed) { closed = true; await pool.end(); } },
  };
}
