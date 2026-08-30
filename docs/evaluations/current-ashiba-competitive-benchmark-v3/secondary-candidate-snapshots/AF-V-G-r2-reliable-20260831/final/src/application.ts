import { Pool, type PoolClient } from 'pg';
import { createTicketSql, getTicketSql, listTicketsSql, type SortDirection, type TicketSort } from './tickets/sql/ticket-sql.js';

type TicketStatus = 'open' | 'pending' | 'closed';

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

type ErrorCode = 'VALIDATION' | 'NOT_FOUND' | 'APPLICATION_CLOSED';

function invalid(code: ErrorCode, message: string): Error & { code: ErrorCode } {
  return Object.assign(new Error(message), { code });
}

function status(value: unknown): value is TicketStatus {
  return value === 'open' || value === 'pending' || value === 'closed';
}

function sort(value: unknown): value is TicketSort {
  return value === 'id' || value === 'priority' || value === 'createdAt';
}

function direction(value: unknown): value is SortDirection {
  return value === 'asc' || value === 'desc';
}

function id(value: unknown): string {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) throw invalid('VALIDATION', 'id must be a positive integer string');
  return value;
}

function ticket(row: Record<string, unknown>): Ticket {
  return {
    id: String(row.id),
    title: String(row.title),
    status: row.status as TicketStatus,
    assignee: row.assignee === null ? null : String(row.assignee),
    priority: Number(row.priority),
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : new Date(String(row.createdAt)).toISOString(),
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
  };
}

/** The vertical slice owns visible ticket SQL and native-pg execution. */
export function createApplication(runtime: Runtime) {
  const pool = new Pool({ connectionString: runtime.connectionString });
  let isClosed = false;
  const ensureOpen = () => {
    if (isClosed) throw invalid('APPLICATION_CLOSED', 'application is closed');
  };

  return {
    async list(input: { status?: TicketStatus; assignee?: string | null; sort?: TicketSort; direction?: SortDirection; offset?: number; limit?: number } = {}): Promise<Ticket[]> {
      ensureOpen();
      if (input.status !== undefined && !status(input.status)) throw invalid('VALIDATION', 'invalid status');
      const requestedSort = input.sort ?? 'id';
      const requestedDirection = input.direction ?? 'asc';
      if (!sort(requestedSort) || !direction(requestedDirection)) throw invalid('VALIDATION', 'invalid sort');
      const offset = input.offset ?? 0;
      const limit = input.limit ?? 100;
      if (!Number.isInteger(offset) || offset < 0 || offset > 10_000 || !Number.isInteger(limit) || limit < 1 || limit > 100) throw invalid('VALIDATION', 'invalid pagination');
      const filterAssignee = Object.hasOwn(input, 'assignee');
      if (filterAssignee && input.assignee !== null && typeof input.assignee !== 'string') throw invalid('VALIDATION', 'invalid assignee');
      const result = await pool.query<Record<string, unknown>>(
        listTicketsSql(requestedSort, requestedDirection),
        [input.status ?? null, filterAssignee, filterAssignee ? input.assignee ?? null : null, limit, offset],
      );
      return result.rows.map(ticket);
    },
    async get(input: { id: string }): Promise<Ticket | null> {
      ensureOpen();
      const result = await pool.query<Record<string, unknown>>(getTicketSql, [id(input?.id)]);
      return result.rows[0] ? ticket(result.rows[0]) : null;
    },
    async create(input: { title: string; status: TicketStatus; assignee: string | null; priority: number; metadata?: Record<string, unknown> }): Promise<Ticket> {
      ensureOpen();
      if (!input || typeof input.title !== 'string' || !status(input.status) || (input.assignee !== null && typeof input.assignee !== 'string') || !Number.isInteger(input.priority) || input.priority < 1 || input.priority > 5) throw invalid('VALIDATION', 'invalid ticket');
      const result = await pool.query<Record<string, unknown>>(createTicketSql, [input.title, input.status, input.assignee, input.priority, JSON.stringify(input.metadata ?? {})]);
      return ticket(result.rows[0]);
    },
    async assign(input: { id: string; assignee: string | null }): Promise<{ id: string; assignee: string | null }> {
      ensureOpen();
      const ticketId = id(input?.id);
      if (input.assignee !== null && typeof input.assignee !== 'string') throw invalid('VALIDATION', 'invalid assignee');
      let client: PoolClient | undefined;
      try {
        client = await pool.connect();
        await client.query('BEGIN');
        const update = await client.query<{ id: string; assignee: string | null }>('UPDATE tickets SET assignee = $2 WHERE id = $1::bigint RETURNING id::text AS id, assignee', [ticketId, input.assignee]);
        if (!update.rows[0]) throw invalid('NOT_FOUND', 'ticket not found');
        await client.query('INSERT INTO ticket_audit (ticket_id, action, detail, created_at) VALUES ($1::bigint, $2, $3, NOW())', [ticketId, 'assigned', input.assignee ?? 'unassigned']);
        await client.query('COMMIT');
        return update.rows[0];
      } catch (error) {
        if (client) await client.query('ROLLBACK').catch(() => undefined);
        throw error;
      } finally {
        client?.release();
      }
    },
    async close(): Promise<void> {
      if (isClosed) return;
      isClosed = true;
      await pool.end();
    },
  };
}
