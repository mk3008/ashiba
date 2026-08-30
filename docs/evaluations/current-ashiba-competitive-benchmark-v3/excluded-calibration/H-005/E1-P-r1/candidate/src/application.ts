import { Pool, type PoolClient, type QueryConfig } from 'pg';

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

type RawValue = string | number | bigint | boolean;

const ticketSpec = {
  id: 'pg/text@1', title: 'pg/text@1', status: 'pg/text@1',
  assignee: { codecId: 'pg/text@1', nullable: true }, priority: 'pg/int4@1',
  createdAt: 'pg/text@1', metadata: 'pg/text@1',
} as const;
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
function buildList(input: ListInput): QueryConfig<RawValue[]> {
  const values: RawValue[] = []; const parameter = (value: RawValue): string => `$${values.push(value)}`;
  let text = `SELECT ${ticketColumns} FROM tickets`; let where = false;
  const condition = (fragment: string): void => { text += where ? ` AND ${fragment}` : ` WHERE ${fragment}`; where = true; };
  if (input.status !== undefined) condition(`status = ${parameter(input.status)}::ticket_status`);
  if (input.hasAssignee) {
    if (input.assignee === null) condition('assignee IS NULL');
    else condition(`assignee = ${parameter(input.assignee)}`);
  }
  text += ` ORDER BY ${sortColumns[input.sort]} ${input.direction.toUpperCase()}, id ASC OFFSET ${parameter(input.offset)} LIMIT ${parameter(input.limit)}`;
  return { text, values };
}
function open(value: boolean): void { if (!value) throw new CandidateError('APPLICATION_CLOSED', 'application is closed'); }
async function queryTickets(client: Pool | PoolClient, query: QueryConfig<RawValue[]>): Promise<Ticket[]> {
  return (await client.query(query)).rows.map(ticket);
}

export function createApplication(runtime: Runtime): Application {
  if (!record(runtime) || typeof runtime.connectionString !== 'string') invalid('runtime.connectionString must be a string');
  const db = new Pool({ connectionString: runtime.connectionString }); let active = true;
  return {
    async list(input): Promise<Ticket[]> { open(active); return queryTickets(db, buildList(listInput(input))); },
    async get(input): Promise<Ticket | null> {
      open(active); const ticketId = id(object(input, 'get input').id);
      const results = await queryTickets(db, { text: `SELECT ${ticketColumns} FROM tickets WHERE id = $1::bigint LIMIT 1`, values: [ticketId] });
      return results.length === 0 ? null : results[0] ?? null;
    },
    async create(input): Promise<Ticket> {
      open(active); const data = object(input, 'create input'); const title = data.title;
      if (typeof title !== 'string') invalid('title must be a string');
      const ticketStatus = status(data.status); const assignee = nullableString(data.assignee, 'assignee'); const ticketPriority = priority(data.priority);
      const metadata = Object.hasOwn(data, 'metadata') ? data.metadata : {};
      if (!record(metadata) || !jsonValue(metadata)) invalid('metadata must be a JSON-safe object');
      const assigneeValue = assignee === null ? 'NULL' : '$3';
      const values: RawValue[] = [title, ticketStatus];
      if (assignee !== null) values.push(assignee);
      values.push(ticketPriority, JSON.stringify(metadata));
      const results = await queryTickets(db, { text: `INSERT INTO tickets (title, status, assignee, priority, created_at, metadata) VALUES ($1, $2::ticket_status, ${assigneeValue}, $${values.length - 1}, CURRENT_TIMESTAMP, $${values.length}::jsonb) RETURNING ${ticketColumns}`, values });
      if (results.length !== 1) throw new Error('ticket creation did not return one row'); return results[0] ?? (() => { throw new Error('ticket creation did not return one row'); })();
    },
    async assign(input): Promise<{ id: string; assignee: string | null }> {
      open(active); const data = object(input, 'assign input'); const ticketId = id(data.id); const assignee = nullableString(data.assignee, 'assignee');
      const client = await db.connect();
      try {
        await client.query('BEGIN');
        const assigneeValue = assignee === null ? 'NULL' : '$1';
        const updateValues = assignee === null ? [ticketId] : [assignee, ticketId];
        const idParameter = assignee === null ? '$1' : '$2';
        const updated = await client.query({ text: `UPDATE tickets SET assignee = ${assigneeValue} WHERE id = ${idParameter}::bigint RETURNING id::text AS id, assignee`, values: updateValues });
        if (updated.rows.length === 0) throw new CandidateError('NOT_FOUND', 'ticket was not found');
        const result = updated.rows[0];
        if (!record(result) || typeof result.id !== 'string' || (result.assignee !== null && typeof result.assignee !== 'string')) throw new Error('database returned invalid assignment data');
        await client.query({ text: 'INSERT INTO ticket_audit (ticket_id, action, detail, created_at) VALUES ($1::bigint, $2, $3::jsonb, CURRENT_TIMESTAMP)', values: [ticketId, 'assign', JSON.stringify({ assignee })] });
        await client.query('COMMIT'); return { id: result.id, assignee: result.assignee };
      } catch (error) {
        await client.query('ROLLBACK'); throw error;
      } finally { client.release(); }
    },
    async close(): Promise<void> { if (!active) return; active = false; await db.end(); },
  };
}
