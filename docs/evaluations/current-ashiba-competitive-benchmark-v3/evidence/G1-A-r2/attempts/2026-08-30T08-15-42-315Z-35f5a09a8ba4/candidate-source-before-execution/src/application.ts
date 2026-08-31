import { bindNamedParameters } from '@ashiba-ts/named-parameters';
import { compileNamedParameters } from '@ashiba-ts/named-parameters/compiler';
import { Pool, type PoolClient, type QueryResultRow } from 'pg';

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
type ListInput = { status?: TicketStatus; assignee?: string | null; sort?: TicketSort; direction?: SortDirection; offset?: number; limit?: number };
type CreateInput = { title: string; status: TicketStatus; assignee: string | null; priority: number; metadata?: Record<string, unknown> };
export interface Application {
  list(input?: ListInput): Promise<Ticket[]>;
  get(input: { id: string }): Promise<Ticket | null>;
  create(input: CreateInput): Promise<Ticket>;
  assign(input: { id: string; assignee: string | null }): Promise<{ id: string; assignee: string | null }>;
  close(): Promise<void>;
}
type TicketRow = QueryResultRow & { id: string; title: string; status: TicketStatus; assignee: string | null; priority: number; created_at: Date | string; metadata: Record<string, unknown> };

const TICKET_COLUMNS = 'id::text AS id, title, status::text AS status, assignee, priority, created_at, metadata';
// The finite mapping below is the only application-controlled SQL syntax choice.
const LIST_SQL = {
  id: {
    asc: `SELECT ${TICKET_COLUMNS} FROM tickets WHERE (:status::ticket_status IS NULL OR status = :status::ticket_status) AND (NOT :filterAssignee::boolean OR assignee IS NOT DISTINCT FROM :assignee::text) ORDER BY id ASC OFFSET :offset::integer LIMIT :limit::integer`,
    desc: `SELECT ${TICKET_COLUMNS} FROM tickets WHERE (:status::ticket_status IS NULL OR status = :status::ticket_status) AND (NOT :filterAssignee::boolean OR assignee IS NOT DISTINCT FROM :assignee::text) ORDER BY id DESC OFFSET :offset::integer LIMIT :limit::integer`,
  },
  priority: {
    asc: `SELECT ${TICKET_COLUMNS} FROM tickets WHERE (:status::ticket_status IS NULL OR status = :status::ticket_status) AND (NOT :filterAssignee::boolean OR assignee IS NOT DISTINCT FROM :assignee::text) ORDER BY priority ASC, id ASC OFFSET :offset::integer LIMIT :limit::integer`,
    desc: `SELECT ${TICKET_COLUMNS} FROM tickets WHERE (:status::ticket_status IS NULL OR status = :status::ticket_status) AND (NOT :filterAssignee::boolean OR assignee IS NOT DISTINCT FROM :assignee::text) ORDER BY priority DESC, id ASC OFFSET :offset::integer LIMIT :limit::integer`,
  },
  createdAt: {
    asc: `SELECT ${TICKET_COLUMNS} FROM tickets WHERE (:status::ticket_status IS NULL OR status = :status::ticket_status) AND (NOT :filterAssignee::boolean OR assignee IS NOT DISTINCT FROM :assignee::text) ORDER BY created_at ASC, id ASC OFFSET :offset::integer LIMIT :limit::integer`,
    desc: `SELECT ${TICKET_COLUMNS} FROM tickets WHERE (:status::ticket_status IS NULL OR status = :status::ticket_status) AND (NOT :filterAssignee::boolean OR assignee IS NOT DISTINCT FROM :assignee::text) ORDER BY created_at DESC, id ASC OFFSET :offset::integer LIMIT :limit::integer`,
  },
} as const;
const preparedLists = {
  id: { asc: compileNamedParameters(LIST_SQL.id.asc), desc: compileNamedParameters(LIST_SQL.id.desc) },
  priority: { asc: compileNamedParameters(LIST_SQL.priority.asc), desc: compileNamedParameters(LIST_SQL.priority.desc) },
  createdAt: { asc: compileNamedParameters(LIST_SQL.createdAt.asc), desc: compileNamedParameters(LIST_SQL.createdAt.desc) },
} as const;
const preparedGet = compileNamedParameters(`SELECT ${TICKET_COLUMNS} FROM tickets WHERE id = :id::bigint`);
const preparedCreate = compileNamedParameters(`INSERT INTO tickets (title, status, assignee, priority, created_at, metadata) VALUES (:title::text, :status::ticket_status, :assignee::text, :priority::integer, CURRENT_TIMESTAMP, :metadata::jsonb) RETURNING ${TICKET_COLUMNS}`);
const preparedAssign = compileNamedParameters('UPDATE tickets SET assignee = :assignee::text WHERE id = :id::bigint RETURNING id::text AS id, assignee');
const preparedAudit = compileNamedParameters("INSERT INTO ticket_audit (ticket_id, action, detail, created_at) VALUES (:id::bigint, 'assign', :detail::text, CURRENT_TIMESTAMP)");
const STATUSES = new Set<TicketStatus>(['open', 'pending', 'closed']);
const SORTS = new Set<TicketSort>(['id', 'priority', 'createdAt']);
const DIRECTIONS = new Set<SortDirection>(['asc', 'desc']);

function error(code: ApplicationError['code']): ApplicationError { const result = new Error(code) as ApplicationError; result.code = code; return result; }
function assertRecord(value: unknown): asserts value is Record<string, unknown> { if (value === null || typeof value !== 'object' || Array.isArray(value)) throw error('VALIDATION'); }
function assertId(value: unknown): asserts value is string { if (typeof value !== 'string' || !/^[1-9][0-9]*$/.test(value)) throw error('VALIDATION'); }
function isJsonSafe(value: unknown): boolean {
  if (value === null || ['string', 'boolean'].includes(typeof value)) return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonSafe);
  if (typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return (proto === Object.prototype || proto === null) && Object.values(value as Record<string, unknown>).every(isJsonSafe);
}
function mapTicket(row: TicketRow): Ticket {
  return { id: row.id, title: row.title, status: row.status, assignee: row.assignee, priority: row.priority,
    createdAt: (row.created_at instanceof Date ? row.created_at : new Date(row.created_at)).toISOString(), metadata: row.metadata };
}
function normalizeList(input: ListInput | undefined): { status: TicketStatus | null; assignee: string | null; filterAssignee: boolean; sort: TicketSort; direction: SortDirection; offset: number; limit: number } {
  if (input === undefined) input = {};
  assertRecord(input);
  const { status, sort = 'id', direction = 'asc', offset = 0, limit = 100 } = input;
  if (status !== undefined && !STATUSES.has(status)) throw error('VALIDATION');
  if (!SORTS.has(sort) || !DIRECTIONS.has(direction) || !Number.isInteger(offset) || offset < 0 || offset > 10_000 || !Number.isInteger(limit) || limit < 1 || limit > 100) throw error('VALIDATION');
  const filterAssignee = input.assignee !== undefined;
  if (filterAssignee && input.assignee !== null && typeof input.assignee !== 'string') throw error('VALIDATION');
  return { status: status ?? null, assignee: input.assignee ?? null, filterAssignee, sort, direction, offset, limit };
}
async function rollback(client: PoolClient, cause: unknown): Promise<never> { try { await client.query('ROLLBACK'); } catch { /* retain the original failure */ } throw cause; }

export function createApplication(runtime: Runtime): Application {
  assertRecord(runtime);
  if (typeof runtime.connectionString !== 'string' || typeof runtime.schema !== 'string') throw error('VALIDATION');
  const pool = new Pool({ connectionString: runtime.connectionString });
  let closed = false;
  const ensureOpen = (): void => { if (closed) throw error('APPLICATION_CLOSED'); };
  return {
    async list(input) {
      ensureOpen();
      const normalized = normalizeList(input);
      const query = bindNamedParameters(preparedLists[normalized.sort][normalized.direction], {
        status: normalized.status,
        assignee: normalized.assignee,
        filterAssignee: normalized.filterAssignee,
        offset: normalized.offset,
        limit: normalized.limit,
      });
      const result = await pool.query<TicketRow>(query.sql, [...query.values]);
      return result.rows.map(mapTicket);
    },
    async get(input) {
      ensureOpen(); assertRecord(input); assertId(input.id);
      const query = bindNamedParameters(preparedGet, { id: input.id });
      const result = await pool.query<TicketRow>(query.sql, [...query.values]);
      return result.rows[0] === undefined ? null : mapTicket(result.rows[0]);
    },
    async create(input) {
      ensureOpen(); assertRecord(input);
      if (typeof input.title !== 'string' || !STATUSES.has(input.status) || (input.assignee !== null && typeof input.assignee !== 'string') || !Number.isInteger(input.priority) || input.priority < 1 || input.priority > 5) throw error('VALIDATION');
      const metadata = input.metadata ?? {};
      if (Array.isArray(metadata) || !isJsonSafe(metadata)) throw error('VALIDATION');
      const query = bindNamedParameters(preparedCreate, { title: input.title, status: input.status, assignee: input.assignee, priority: input.priority, metadata: JSON.stringify(metadata) });
      const result = await pool.query<TicketRow>(query.sql, [...query.values]);
      return mapTicket(result.rows[0]!);
    },
    async assign(input) {
      ensureOpen(); assertRecord(input); assertId(input.id);
      if (input.assignee !== null && typeof input.assignee !== 'string') throw error('VALIDATION');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const update = bindNamedParameters(preparedAssign, { id: input.id, assignee: input.assignee });
        const result = await client.query<{ id: string; assignee: string | null }>(update.sql, [...update.values]);
        const row = result.rows[0];
        if (row === undefined) throw error('NOT_FOUND');
        const audit = bindNamedParameters(preparedAudit, { id: input.id, detail: JSON.stringify({ assignee: input.assignee }) });
        await client.query(audit.sql, [...audit.values]);
        await client.query('COMMIT');
        return row;
      } catch (cause) { return rollback(client, cause); } finally { client.release(); }
    },
    async close() { if (closed) return; closed = true; await pool.end(); },
  };
}
