import { Pool, type QueryResultRow } from 'pg';

export type TicketStatus = 'open' | 'pending' | 'closed';
export type TicketSort = 'id' | 'priority' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

export interface Runtime { connectionString: string; schema: string; }
export interface Ticket {
  id: string; title: string; status: TicketStatus; assignee: string | null;
  priority: number; createdAt: string; metadata: Record<string, unknown>;
}
export interface ApplicationError extends Error {
  code: 'VALIDATION' | 'NOT_FOUND' | 'INSUFFICIENT_FUNDS' | 'APPLICATION_CLOSED';
}
export interface Application {
  list(input?: { status?: TicketStatus; assignee?: string | null; sort?: TicketSort; direction?: SortDirection; offset?: number; limit?: number }): Promise<Ticket[]>;
  get(input: { id: string }): Promise<Ticket | null>;
  create(input: { title: string; status: TicketStatus; assignee: string | null; priority: number; metadata?: Record<string, unknown> }): Promise<Ticket>;
  assign(input: { id: string; assignee: string | null }): Promise<{ id: string; assignee: string | null }>;
  close(): Promise<void>;
}

type TicketRow = QueryResultRow & {
  id: string; title: string; status: string; assignee: string | null;
  priority: number; createdAt: string; metadata: string;
};
const ticketColumns = [
  'id::text AS id', 'title', 'status::text AS status', 'assignee', 'priority',
  `to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "createdAt"`,
  'metadata::text AS metadata',
].join(', ');
const sortColumns: Record<TicketSort, string> = { id: 'id', priority: 'priority', createdAt: 'created_at' };

class CandidateError extends Error implements ApplicationError {
  constructor(readonly code: ApplicationError['code'], message: string) { super(message); this.name = 'ApplicationError'; }
}
function invalid(message: string): never { throw new CandidateError('VALIDATION', message); }
function record(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function jsonValue(value: unknown): boolean {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  return Array.isArray(value) ? value.every(jsonValue) : record(value) && Object.values(value).every(jsonValue);
}
function object(value: unknown, name: string): Record<string, unknown> { return record(value) ? value : invalid(`${name} must be an object`); }
function status(value: unknown): TicketStatus {
  return value === 'open' || value === 'pending' || value === 'closed' ? value : invalid('status is invalid');
}
function id(value: unknown): string {
  return typeof value === 'string' && /^[1-9][0-9]*$/.test(value) && BigInt(value) <= 9223372036854775807n
    ? value : invalid('id must be a positive bigint string');
}
function nullableString(value: unknown, name: string): string | null { return value === null || typeof value === 'string' ? value : invalid(`${name} must be a string or null`); }
function priority(value: unknown): number { return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5 ? value : invalid('priority is invalid'); }
function page(value: unknown, name: 'offset' | 'limit'): number {
  const min = name === 'offset' ? 0 : 1; const max = name === 'offset' ? 10_000 : 100;
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max ? value : invalid(`${name} is invalid`);
}
function isStatus(value: unknown): value is TicketStatus { return value === 'open' || value === 'pending' || value === 'closed'; }
function ticket(value: unknown): Ticket {
  if (!record(value)) throw new Error('database returned a non-object ticket');
  const { id: ticketId, title, status: ticketStatus, assignee, priority: ticketPriority, createdAt, metadata: text } = value;
  if (typeof ticketId !== 'string' || typeof title !== 'string' || !isStatus(ticketStatus) ||
    (assignee !== null && typeof assignee !== 'string') || typeof ticketPriority !== 'number' ||
    typeof createdAt !== 'string' || typeof text !== 'string') throw new Error('database returned invalid ticket data');
  const metadata: unknown = JSON.parse(text);
  if (!record(metadata) || !jsonValue(metadata)) throw new Error('database returned invalid metadata');
  return { id: ticketId, title, status: ticketStatus, assignee, priority: ticketPriority, createdAt, metadata };
}
type ListInput = { status?: TicketStatus; hasAssignee: boolean; assignee: string | null; sort: TicketSort; direction: SortDirection; offset: number; limit: number; };
function listInput(value: unknown): ListInput {
  if (value === undefined) return { hasAssignee: false, assignee: null, sort: 'id', direction: 'asc', offset: 0, limit: 100 };
  const input = object(value, 'list input');
  const selectedStatus = Object.hasOwn(input, 'status') ? status(input.status) : undefined;
  const hasAssignee = Object.hasOwn(input, 'assignee');
  const assignee = hasAssignee ? nullableString(input.assignee, 'assignee') : null;
  const sort = Object.hasOwn(input, 'sort') ? input.sort : 'id';
  const direction = Object.hasOwn(input, 'direction') ? input.direction : 'asc';
  if (sort !== 'id' && sort !== 'priority' && sort !== 'createdAt') invalid('sort is invalid');
  if (direction !== 'asc' && direction !== 'desc') invalid('direction is invalid');
  return { ...(selectedStatus === undefined ? {} : { status: selectedStatus }), hasAssignee, assignee, sort, direction,
    offset: Object.hasOwn(input, 'offset') ? page(input.offset, 'offset') : 0, limit: Object.hasOwn(input, 'limit') ? page(input.limit, 'limit') : 100 };
}
function open(value: boolean): void { if (!value) throw new CandidateError('APPLICATION_CLOSED', 'application is closed'); }

export function createApplication(runtime: Runtime): Application {
  if (!record(runtime) || typeof runtime.connectionString !== 'string') invalid('runtime.connectionString must be a string');
  const pool = new Pool({ connectionString: runtime.connectionString }); let active = true;
  return {
    async list(input): Promise<Ticket[]> {
      open(active); const data = listInput(input); const values: Array<string | number | null> = [];
      const clauses: string[] = [];
      if (data.status !== undefined) { values.push(data.status); clauses.push(`status = $${values.length}::ticket_status`); }
      if (data.hasAssignee) {
        if (data.assignee === null) clauses.push('assignee IS NULL');
        else { values.push(data.assignee); clauses.push(`assignee = $${values.length}`); }
      }
      values.push(data.offset, data.limit);
      const where = clauses.length === 0 ? '' : ` WHERE ${clauses.join(' AND ')}`;
      const result = await pool.query<TicketRow>(`SELECT ${ticketColumns} FROM tickets${where} ORDER BY ${sortColumns[data.sort]} ${data.direction.toUpperCase()}, id ASC OFFSET $${values.length - 1} LIMIT $${values.length}`, values);
      return result.rows.map(ticket);
    },
    async get(input): Promise<Ticket | null> {
      open(active); const ticketId = id(object(input, 'get input').id);
      const result = await pool.query<TicketRow>(`SELECT ${ticketColumns} FROM tickets WHERE id = $1::bigint LIMIT 1`, [ticketId]);
      return result.rows.length === 0 ? null : ticket(result.rows[0]);
    },
    async create(input): Promise<Ticket> {
      open(active); const data = object(input, 'create input'); const title = data.title;
      if (typeof title !== 'string') invalid('title must be a string');
      const ticketStatus = status(data.status); const assignee = nullableString(data.assignee, 'assignee'); const ticketPriority = priority(data.priority);
      const metadata = Object.hasOwn(data, 'metadata') ? data.metadata : {};
      if (!record(metadata) || !jsonValue(metadata)) invalid('metadata must be a JSON-safe object');
      const result = await pool.query<TicketRow>(`INSERT INTO tickets (title, status, assignee, priority, created_at, metadata)
        VALUES ($1, $2::ticket_status, $3, $4, CURRENT_TIMESTAMP, $5::jsonb) RETURNING ${ticketColumns}`,
      [title, ticketStatus, assignee, ticketPriority, JSON.stringify(metadata)]);
      if (result.rows.length !== 1) throw new Error('ticket creation did not return one row'); return ticket(result.rows[0]);
    },
    async assign(input): Promise<{ id: string; assignee: string | null }> {
      open(active); const data = object(input, 'assign input'); const ticketId = id(data.id); const assignee = nullableString(data.assignee, 'assignee');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const updated = await client.query<{ id: string; assignee: string | null }>('UPDATE tickets SET assignee = $1 WHERE id = $2::bigint RETURNING id::text AS id, assignee', [assignee, ticketId]);
        if (updated.rows.length === 0) { await client.query('ROLLBACK'); throw new CandidateError('NOT_FOUND', 'ticket was not found'); }
        const result = updated.rows[0];
        if (result === undefined || typeof result.id !== 'string' || (result.assignee !== null && typeof result.assignee !== 'string')) throw new Error('database returned invalid assignment data');
        await client.query('INSERT INTO ticket_audit (ticket_id, action, detail, created_at) VALUES ($1::bigint, $2, $3::jsonb, CURRENT_TIMESTAMP)', [ticketId, 'assign', JSON.stringify({ assignee })]);
        await client.query('COMMIT'); return { id: result.id, assignee: result.assignee };
      } catch (error) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw error;
      } finally { client.release(); }
    },
    async close(): Promise<void> { if (!active) return; active = false; await pool.end(); },
  };
}
