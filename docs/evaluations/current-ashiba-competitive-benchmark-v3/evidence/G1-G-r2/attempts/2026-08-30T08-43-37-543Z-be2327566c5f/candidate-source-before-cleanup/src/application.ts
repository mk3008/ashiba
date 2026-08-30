import { Pool, type PoolClient } from 'pg';

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
  list(input?: { status?: TicketStatus; assignee?: string | null; sort?: TicketSort; direction?: SortDirection; offset?: number; limit?: number }): Promise<Ticket[]>;
  get(input: { id: string }): Promise<Ticket | null>;
  create(input: { title: string; status: TicketStatus; assignee: string | null; priority: number; metadata?: Record<string, unknown> }): Promise<Ticket>;
  assign(input: { id: string; assignee: string | null }): Promise<{ id: string; assignee: string | null }>;
  close(): Promise<void>;
}

type TicketRow = {
  id: string;
  title: string;
  status: TicketStatus;
  assignee: string | null;
  priority: number;
  created_at: Date | string;
  metadata: Record<string, unknown>;
};

const STATUSES = new Set<TicketStatus>(['open', 'pending', 'closed']);

// These finite, source-controlled mappings are the only dynamic SQL syntax in list().
const SORT_COLUMNS: Record<TicketSort, string> = { id: 'id', priority: 'priority', createdAt: 'created_at' };
const SORT_DIRECTIONS: Record<SortDirection, string> = { asc: 'ASC', desc: 'DESC' };

function applicationError(code: ApplicationError['code'], message: string): ApplicationError {
  const error = new Error(message) as ApplicationError;
  error.code = code;
  return error;
}

function validation(message: string): never {
  throw applicationError('VALIDATION', message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isJsonValue(value: unknown, seen: Set<object>): boolean {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) {
    if (seen.has(value)) return false;
    seen.add(value);
    const valid = value.every((item) => isJsonValue(item, seen));
    seen.delete(value);
    return valid;
  }
  if (!isRecord(value) || seen.has(value)) return false;
  seen.add(value);
  const valid = Object.values(value).every((item) => isJsonValue(item, seen));
  seen.delete(value);
  return valid;
}

function requireObject(value: unknown, name: string): Record<string, unknown> {
  if (!isRecord(value)) validation(`${name} must be an object`);
  return value;
}

function requireText(value: unknown, name: string): string {
  if (typeof value !== 'string') validation(`${name} must be a string`);
  return value;
}

function requireNullableText(value: unknown, name: string): string | null {
  if (value !== null && typeof value !== 'string') validation(`${name} must be a string or null`);
  return value;
}

function requireStatus(value: unknown): TicketStatus {
  if (typeof value !== 'string' || !STATUSES.has(value as TicketStatus)) validation('status is invalid');
  return value as TicketStatus;
}

function requirePositiveId(value: unknown, name: string): string {
  const id = requireText(value, name);
  if (!/^[1-9][0-9]*$/.test(id)) validation(`${name} must be a positive base-10 integer string`);
  try {
    if (BigInt(id) > 9_223_372_036_854_775_807n) validation(`${name} is outside PostgreSQL bigint range`);
  } catch {
    validation(`${name} must be a positive base-10 integer string`);
  }
  return id;
}

function requirePriority(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 5) validation('priority must be an integer from 1 through 5');
  return value;
}

function requirePagination(value: unknown, name: 'offset' | 'limit'): number {
  const [minimum, maximum] = name === 'offset' ? [0, 10_000] : [1, 100];
  if (typeof value !== 'number' || !Number.isInteger(value) || value < minimum || value > maximum) validation(`${name} is out of range`);
  return value;
}

function toTicket(row: TicketRow): Ticket {
  const createdAt = row.created_at instanceof Date ? row.created_at.toISOString() : new Date(row.created_at).toISOString();
  return { id: String(row.id), title: row.title, status: row.status, assignee: row.assignee, priority: row.priority, createdAt, metadata: row.metadata };
}

async function rollback(client: PoolClient): Promise<void> {
  try { await client.query('ROLLBACK'); } catch { /* release lets pg discard a broken client */ }
}

export function createApplication(runtime: Runtime): Application {
  const runtimeObject = requireObject(runtime, 'runtime');
  const connectionString = requireText(runtimeObject.connectionString, 'runtime.connectionString');
  // The runner's candidate role supplies the nonce-schema search_path; runtime.schema is never interpolated.
  requireText(runtimeObject.schema, 'runtime.schema');
  const pool = new Pool({ connectionString });
  let closed = false;
  let closePromise: Promise<void> | undefined;

  function ensureOpen(): void {
    if (closed) throw applicationError('APPLICATION_CLOSED', 'application is closed');
  }

  return {
    async list(input = {}): Promise<Ticket[]> {
      ensureOpen();
      const values = requireObject(input, 'input');
      const conditions: string[] = [];
      const params: Array<string | number> = [];
      if (values.status !== undefined) {
        params.push(requireStatus(values.status));
        conditions.push(`status = $${params.length}`);
      }
      if (values.assignee !== undefined) {
        const assignee = requireNullableText(values.assignee, 'assignee');
        if (assignee === null) conditions.push('assignee IS NULL');
        else { params.push(assignee); conditions.push(`assignee = $${params.length}`); }
      }
      const sort = values.sort === undefined ? 'id' : values.sort;
      if (typeof sort !== 'string' || !Object.hasOwn(SORT_COLUMNS, sort)) validation('sort is invalid');
      const direction = values.direction === undefined ? 'asc' : values.direction;
      if (typeof direction !== 'string' || !Object.hasOwn(SORT_DIRECTIONS, direction)) validation('direction is invalid');
      const offset = values.offset === undefined ? 0 : requirePagination(values.offset, 'offset');
      const limit = values.limit === undefined ? 100 : requirePagination(values.limit, 'limit');
      params.push(offset, limit);
      const where = conditions.length === 0 ? '' : ` WHERE ${conditions.join(' AND ')}`;
      const sql = `SELECT id::text AS id, title, status, assignee, priority, created_at, metadata FROM tickets${where} ORDER BY ${SORT_COLUMNS[sort as TicketSort]} ${SORT_DIRECTIONS[direction as SortDirection]}, id ASC OFFSET $${params.length - 1} LIMIT $${params.length}`;
      const result = await pool.query<TicketRow>(sql, params);
      return result.rows.map(toTicket);
    },

    async get(input): Promise<Ticket | null> {
      ensureOpen();
      const id = requirePositiveId(requireObject(input, 'input').id, 'id');
      const result = await pool.query<TicketRow>('SELECT id::text AS id, title, status, assignee, priority, created_at, metadata FROM tickets WHERE id = $1', [id]);
      return result.rows.length === 0 ? null : toTicket(result.rows[0]);
    },

    async create(input): Promise<Ticket> {
      ensureOpen();
      const values = requireObject(input, 'input');
      const title = requireText(values.title, 'title');
      const status = requireStatus(values.status);
      const assignee = requireNullableText(values.assignee, 'assignee');
      const priority = requirePriority(values.priority);
      const metadata = values.metadata === undefined ? {} : values.metadata;
      if (!isRecord(metadata) || !isJsonValue(metadata, new Set<object>())) validation('metadata must be JSON-safe object data');
      const result = await pool.query<TicketRow>(
        'INSERT INTO tickets (title, status, assignee, priority, created_at, metadata) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5::jsonb) RETURNING id::text AS id, title, status, assignee, priority, created_at, metadata',
        [title, status, assignee, priority, JSON.stringify(metadata)],
      );
      return toTicket(result.rows[0]);
    },

    async assign(input): Promise<{ id: string; assignee: string | null }> {
      ensureOpen();
      const values = requireObject(input, 'input');
      const id = requirePositiveId(values.id, 'id');
      const assignee = requireNullableText(values.assignee, 'assignee');
      const client = await pool.connect();
      let transactionOpen = false;
      try {
        await client.query('BEGIN');
        transactionOpen = true;
        const updated = await client.query<{ id: string; assignee: string | null }>('UPDATE tickets SET assignee = $1 WHERE id = $2 RETURNING id::text AS id, assignee', [assignee, id]);
        if (updated.rows.length === 0) {
          await client.query('ROLLBACK');
          transactionOpen = false;
          throw applicationError('NOT_FOUND', 'ticket was not found');
        }
        await client.query("INSERT INTO ticket_audit (ticket_id, action, detail, created_at) VALUES ($1, 'assigned', $2, CURRENT_TIMESTAMP)", [id, JSON.stringify({ assignee })]);
        await client.query('COMMIT');
        transactionOpen = false;
        return { id: String(updated.rows[0].id), assignee: updated.rows[0].assignee };
      } catch (error) {
        if (transactionOpen) await rollback(client);
        throw error;
      } finally {
        client.release();
      }
    },

    async close(): Promise<void> {
      if (!closePromise) {
        closed = true;
        closePromise = pool.end();
      }
      await closePromise;
    },
  };
}
