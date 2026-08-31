import { Pool, type QueryResultRow } from 'pg';

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
  list(input?: ListInput): Promise<Ticket[]>;
  get(input: { id: string }): Promise<Ticket | null>;
  create(input: CreateInput): Promise<Ticket>;
  assign(input: { id: string; assignee: string | null }): Promise<{ id: string; assignee: string | null }>;
  close(): Promise<void>;
}

interface TicketRow extends QueryResultRow {
  id: string;
  title: string;
  status: TicketStatus;
  assignee: string | null;
  priority: number;
  created_at: Date | string;
  metadata: Record<string, unknown> | string;
}

interface AssignmentRow extends QueryResultRow {
  id: string;
  assignee: string | null;
}

interface ListInput {
  status?: TicketStatus;
  assignee?: string | null;
  sort?: TicketSort;
  direction?: SortDirection;
  offset?: number;
  limit?: number;
}

interface CreateInput {
  title: string;
  status: TicketStatus;
  assignee: string | null;
  priority: number;
  metadata?: Record<string, unknown>;
}

const statuses = new Set<TicketStatus>(['open', 'pending', 'closed']);
const sorts: Record<TicketSort, 'id' | 'priority' | 'created_at'> = {
  id: 'id',
  priority: 'priority',
  createdAt: 'created_at',
};
const directions = new Set<SortDirection>(['asc', 'desc']);
const maxBigint = 9_223_372_036_854_775_807n;

function applicationError(code: ApplicationError['code'], message: string): ApplicationError {
  const error = new Error(message) as ApplicationError;
  error.code = code;
  return error;
}

function validation(message: string): never {
  throw applicationError('VALIDATION', message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requirePositiveId(value: unknown, field: string): string {
  if (typeof value !== 'string' || !/^[1-9][0-9]*$/.test(value)) {
    return validation(`${field} must be a positive base-10 integer string`);
  }
  try {
    if (BigInt(value) > maxBigint) {
      return validation(`${field} is out of range`);
    }
  } catch {
    return validation(`${field} must be a positive base-10 integer string`);
  }
  return value;
}

function requireNullableString(value: unknown, field: string): string | null {
  if (value !== null && typeof value !== 'string') {
    return validation(`${field} must be a string or null`);
  }
  return value;
}

function requireJsonObject(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    return validation('metadata must be a JSON object');
  }
  try {
    const serialized = JSON.stringify(value);
    if (serialized === undefined) validation('metadata must be JSON-safe');
    return JSON.parse(serialized) as Record<string, unknown>;
  } catch {
    return validation('metadata must be JSON-safe');
  }
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function toTicket(row: TicketRow): Ticket {
  const metadata = typeof row.metadata === 'string'
    ? JSON.parse(row.metadata) as Record<string, unknown>
    : row.metadata;
  const date = row.created_at instanceof Date ? row.created_at : new Date(row.created_at);
  return {
    id: String(row.id),
    title: row.title,
    status: row.status,
    assignee: row.assignee,
    priority: row.priority,
    createdAt: date.toISOString(),
    metadata,
  };
}

export function createApplication(runtime: Runtime): Application {
  if (!isRecord(runtime) || typeof runtime.connectionString !== 'string' || typeof runtime.schema !== 'string') {
    validation('runtime must contain a connection string and schema');
  }

  const pool = new Pool({ connectionString: runtime.connectionString });
  const schema = quoteIdentifier(runtime.schema);
  const ticketsTable = `${schema}."tickets"`;
  const ticketAuditTable = `${schema}."ticket_audit"`;
  let closed = false;

  function ensureOpen(): void {
    if (closed) throw applicationError('APPLICATION_CLOSED', 'application is closed');
  }

  return {
    async list(input: ListInput = {}): Promise<Ticket[]> {
      ensureOpen();
      if (input === null || typeof input !== 'object' || Array.isArray(input)) validation('list input must be an object');
      const { status, assignee, sort = 'id', direction = 'asc', offset = 0, limit = 100 } = input;
      if (status !== undefined && !statuses.has(status)) validation('invalid status');
      if (assignee !== undefined) requireNullableString(assignee, 'assignee');
      if (!Object.hasOwn(sorts, sort)) validation('invalid sort');
      if (!directions.has(direction)) validation('invalid direction');
      if (!Number.isInteger(offset) || offset < 0 || offset > 10_000) validation('invalid offset');
      if (!Number.isInteger(limit) || limit < 1 || limit > 100) validation('invalid limit');

      const conditions: string[] = [];
      const values: unknown[] = [];
      if (status !== undefined) {
        values.push(status);
        conditions.push(`status = $${values.length}`);
      }
      if (assignee !== undefined) {
        if (assignee === null) {
          conditions.push('assignee IS NULL');
        } else {
          values.push(assignee);
          conditions.push(`assignee = $${values.length}`);
        }
      }
      values.push(offset, limit);
      const where = conditions.length === 0 ? '' : ` WHERE ${conditions.join(' AND ')}`;
      const result = await pool.query<TicketRow>(
        `SELECT id, title, status, assignee, priority, created_at, metadata
         FROM ${ticketsTable}${where}
         ORDER BY ${sorts[sort]} ${direction}, id ASC
         OFFSET $${values.length - 1} LIMIT $${values.length}`,
        values,
      );
      return result.rows.map(toTicket);
    },

    async get(input: { id: string }): Promise<Ticket | null> {
      ensureOpen();
      if (input === null || typeof input !== 'object' || Array.isArray(input)) validation('get input must be an object');
      const id = requirePositiveId(input.id, 'id');
      const result = await pool.query<TicketRow>(
        `SELECT id, title, status, assignee, priority, created_at, metadata
         FROM ${ticketsTable}
         WHERE id = $1
         LIMIT 1`,
        [id],
      );
      const row = result.rows[0];
      return row === undefined ? null : toTicket(row);
    },

    async create(input: CreateInput): Promise<Ticket> {
      ensureOpen();
      if (input === null || typeof input !== 'object' || Array.isArray(input) || typeof input.title !== 'string') validation('title must be a string');
      if (!statuses.has(input.status)) validation('invalid status');
      const assignee = requireNullableString(input.assignee, 'assignee');
      if (!Number.isInteger(input.priority) || input.priority < 1 || input.priority > 5) validation('invalid priority');
      const metadata = input.metadata === undefined ? {} : requireJsonObject(input.metadata);
      const result = await pool.query<TicketRow>(
        `INSERT INTO ${ticketsTable} (title, status, assignee, priority, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, title, status, assignee, priority, created_at, metadata`,
        [input.title, input.status, assignee, input.priority, metadata, new Date()],
      );
      const row = result.rows[0];
      if (row === undefined) throw new Error('ticket insert returned no row');
      return toTicket(row);
    },

    async assign(input: { id: string; assignee: string | null }): Promise<{ id: string; assignee: string | null }> {
      ensureOpen();
      if (input === null || typeof input !== 'object' || Array.isArray(input)) validation('assign input must be an object');
      const id = requirePositiveId(input.id, 'id');
      const assignee = requireNullableString(input.assignee, 'assignee');
      const client = await pool.connect();
      let transactionOpen = false;
      try {
        await client.query('BEGIN');
        transactionOpen = true;
        const result = await client.query<AssignmentRow>(
          `UPDATE ${ticketsTable}
           SET assignee = $1
           WHERE id = $2
           RETURNING id, assignee`,
          [assignee, id],
        );
        const updated = result.rows[0];
        if (updated === undefined) throw applicationError('NOT_FOUND', 'ticket not found');
        await client.query(
          `INSERT INTO ${ticketAuditTable} (ticket_id, action, detail, created_at)
           VALUES ($1, $2, $3, $4)`,
          [updated.id, 'assign', JSON.stringify({ assignee }), new Date()],
        );
        await client.query('COMMIT');
        transactionOpen = false;
        return { id: String(updated.id), assignee: updated.assignee };
      } catch (error) {
        if (transactionOpen) await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },

    async close(): Promise<void> {
      if (closed) return;
      closed = true;
      await pool.end();
    },
  };
}
