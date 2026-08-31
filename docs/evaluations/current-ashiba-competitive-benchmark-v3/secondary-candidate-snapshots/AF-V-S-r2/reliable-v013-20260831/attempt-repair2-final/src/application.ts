import { Pool, type PoolClient } from 'pg';
import {
  createTicket, getTicket, insertTicketAudit, listByCreatedAtAsc,
  listByCreatedAtDesc, listByIdAsc, listByIdDesc, listByPriorityAsc,
  listByPriorityDesc, updateTicketAssignee,
} from './tickets/generated/queries_sql.js';

export type TicketStatus = 'open' | 'pending' | 'closed';
export type TicketSort = 'id' | 'priority' | 'createdAt';
export type SortDirection = 'asc' | 'desc';
export interface Runtime { connectionString: string; schema: string; }
export interface Ticket {
  id: string; title: string; status: TicketStatus; assignee: string | null;
  priority: number; createdAt: string; metadata: Record<string, unknown>;
}
type AppErrorCode = 'VALIDATION' | 'NOT_FOUND' | 'APPLICATION_CLOSED';
function failure(code: AppErrorCode, message: string): Error & { code: AppErrorCode } {
  return Object.assign(new Error(message), { code });
}
function positiveId(value: unknown, name: string): string {
  if (typeof value !== 'string' || !/^[1-9][0-9]*$/.test(value)) throw failure('VALIDATION', `${name} must be a positive integer string`);
  return value;
}
function bounded(value: unknown, name: string, minimum: number, maximum: number, fallback: number): number {
  if (value === undefined) return fallback;
  if (!Number.isInteger(value) || (value as number) < minimum || (value as number) > maximum) throw failure('VALIDATION', `${name} is out of range`);
  return value as number;
}
function status(value: unknown): TicketStatus {
  if (value === 'open' || value === 'pending' || value === 'closed') return value;
  throw failure('VALIDATION', 'unsupported ticket status');
}
function mapTicket(row: { id: string; title: string; status: string; assignee: string | null; priority: number; createdAt: Date; metadata: unknown }): Ticket {
  return { id: String(row.id), title: row.title, status: status(row.status), assignee: row.assignee, priority: row.priority, createdAt: row.createdAt.toISOString(), metadata: (row.metadata ?? {}) as Record<string, unknown> };
}

export function createApplication(runtime: Runtime) {
  const pool = new Pool({ connectionString: runtime.connectionString });
  let closed = false;
  const ensureOpen = () => { if (closed) throw failure('APPLICATION_CLOSED', 'application is closed'); };
  const list = async (input: { status?: TicketStatus; assignee?: string | null; sort?: TicketSort; direction?: SortDirection; offset?: number; limit?: number } = {}): Promise<Ticket[]> => {
    ensureOpen();
    const sort = input.sort ?? 'id';
    const direction = input.direction ?? 'asc';
    if (!['id', 'priority', 'createdAt'].includes(sort) || !['asc', 'desc'].includes(direction)) throw failure('VALIDATION', 'unsupported sort');
    const offset = bounded(input.offset, 'offset', 0, 10_000, 0);
    const limit = bounded(input.limit, 'limit', 1, 100, 100);
    const hasAssignee = Object.prototype.hasOwnProperty.call(input, 'assignee');
    const args = { status: input.status ?? null, assignee: input.assignee ?? null, hasAssignee, pageOffset: String(offset), pageLimit: String(limit) };
    const query = sort === 'id' && direction === 'asc' ? listByIdAsc
      : sort === 'id' && direction === 'desc' ? listByIdDesc
      : sort === 'priority' && direction === 'asc' ? listByPriorityAsc
      : sort === 'priority' && direction === 'desc' ? listByPriorityDesc
      : sort === 'createdAt' && direction === 'asc' ? listByCreatedAtAsc
      : listByCreatedAtDesc;
    return (await query(pool, args)).map(mapTicket);
  };
  const get = async (input: { id: string }): Promise<Ticket | null> => {
    ensureOpen();
    const row = await getTicket(pool, { id: positiveId(input?.id, 'id') });
    return row ? mapTicket(row) : null;
  };
  const create = async (input: { title: string; status: TicketStatus; assignee: string | null; priority: number; metadata?: Record<string, unknown> }): Promise<Ticket> => {
    ensureOpen();
    if (typeof input?.title !== 'string' || input.title.length === 0 || (typeof input.assignee !== 'string' && input.assignee !== null)) throw failure('VALIDATION', 'invalid ticket fields');
    const priority = bounded(input.priority, 'priority', 1, 5, 1);
    const row = await createTicket(pool, { title: input.title, status: status(input.status), assignee: input.assignee, priority, metadata: input.metadata ?? {} });
    if (!row) throw new Error('ticket was not created');
    return mapTicket(row);
  };
  const assign = async (input: { id: string; assignee: string | null }): Promise<{ id: string; assignee: string | null }> => {
    ensureOpen();
    const id = positiveId(input?.id, 'id');
    if (typeof input.assignee !== 'string' && input.assignee !== null) throw failure('VALIDATION', 'invalid assignee');
    const client: PoolClient = await pool.connect();
    try {
      await client.query('BEGIN');
      const updated = await updateTicketAssignee(client, { id, assignee: input.assignee });
      if (!updated) throw failure('NOT_FOUND', 'ticket not found');
      await insertTicketAudit(client, { ticketId: id, detail: input.assignee ?? '' });
      await client.query('COMMIT');
      return { id: String(updated.id), assignee: updated.assignee };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  };
  return { list, get, create, assign, async close() { if (!closed) { closed = true; await pool.end(); } } };
}
