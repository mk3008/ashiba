import { Pool, type PoolClient, type QueryResultRow } from 'pg';

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

type TicketRow = QueryResultRow & {
  id: string;
  title: string;
  status: TicketStatus;
  assignee: string | null;
  priority: number;
  created_at: Date | string;
  metadata: unknown;
};

const STATUSES: readonly TicketStatus[] = ['open', 'pending', 'closed'];
const SORT_COLUMNS: Readonly<Record<TicketSort, string>> = {
  id: 'id',
  priority: 'priority',
  createdAt: 'created_at',
};
const DIRECTIONS: Readonly<Record<SortDirection, string>> = {
  asc: 'ASC',
  desc: 'DESC',
};

function applicationError(code: ApplicationError['code'], message: string): ApplicationError {
  const error = new Error(message) as ApplicationError;
  error.code = code;
  return error;
}

function validation(message: string): never {
  throw applicationError('VALIDATION', message);
}

function isStatus(value: unknown): value is TicketStatus {
  return typeof value === 'string' && STATUSES.includes(value as TicketStatus);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function positiveId(value: unknown, field: string): string {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    validation(`${field} must be a positive base-10 integer string`);
  }
  const parsed = BigInt(value);
  if (parsed <= 0n || parsed > 9_223_372_036_854_775_807n) {
    validation(`${field} must be a positive PostgreSQL bigint`);
  }
  return value;
}

function finiteInteger(value: unknown, field: string, minimum: number, maximum: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < minimum || value > maximum) {
    validation(`${field} must be an integer from ${minimum} through ${maximum}`);
  }
  return value;
}

function assignee(value: unknown, field = 'assignee'): string | null {
  if (value !== null && typeof value !== 'string') {
    validation(`${field} must be a string or null`);
  }
  return value;
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function toTicket(row: TicketRow): Ticket {
  const createdAt = row.created_at instanceof Date ? row.created_at.toISOString() : new Date(row.created_at).toISOString();
  if (!isStatus(row.status) || !Number.isInteger(row.priority) || !isPlainRecord(row.metadata)) {
    throw new Error('Database returned an invalid ticket row');
  }
  return {
    id: String(row.id),
    title: row.title,
    status: row.status,
    assignee: row.assignee,
    priority: row.priority,
    createdAt,
    metadata: row.metadata,
  };
}

function serializeMetadata(metadata: Record<string, unknown>): string {
  try {
    const serialized = JSON.stringify(metadata);
    if (serialized === undefined || !isPlainRecord(JSON.parse(serialized))) {
      validation('metadata must serialize to an object');
    }
    return serialized;
  } catch (error) {
    if ((error as Partial<ApplicationError>).code === 'VALIDATION') throw error;
    validation('metadata must be JSON-safe');
  }
}

export function createApplication(runtime: Runtime): Application {
  const pool = new Pool({ connectionString: runtime.connectionString });
  const schema = quoteIdentifier(runtime.schema);
  const tickets = `${schema}.tickets`;
  const ticketAudit = `${schema}.ticket_audit`;
  let closed = false;
  let closing: Promise<void> | undefined;

  const requireOpen = (): void => {
    if (closed) {
      throw applicationError('APPLICATION_CLOSED', 'Application is closed');
    }
  };

  const selectTicket = `
    SELECT id::text AS id, title, status::text AS status, assignee, priority, created_at, metadata
    FROM ${tickets}`;

  return {
    async list(input = {}): Promise<Ticket[]> {
      requireOpen();
      if (!isPlainRecord(input)) validation('list input must be an object');

      const values: Array<string | number | null> = [];
      const filters: string[] = [];
      if (input.status !== undefined) {
        if (!isStatus(input.status)) validation('status is invalid');
        values.push(input.status);
        filters.push(`status = $${values.length}`);
      }
      if (input.assignee !== undefined) {
        values.push(assignee(input.assignee));
        filters.push(`assignee IS NOT DISTINCT FROM $${values.length}`);
      }

      const sort = input.sort ?? 'id';
      if (!(sort in SORT_COLUMNS)) validation('sort is invalid');
      const direction = input.direction ?? 'asc';
      if (!(direction in DIRECTIONS)) validation('direction is invalid');
      const offset = input.offset ?? 0;
      const limit = input.limit ?? 100;
      finiteInteger(offset, 'offset', 0, 10_000);
      finiteInteger(limit, 'limit', 1, 100);
      values.push(offset, limit);

      const where = filters.length === 0 ? '' : ` WHERE ${filters.join(' AND ')}`;
      const result = await pool.query<TicketRow>(
        `${selectTicket}${where} ORDER BY ${SORT_COLUMNS[sort]} ${DIRECTIONS[direction]}, id ASC OFFSET $${values.length - 1} LIMIT $${values.length}`,
        values,
      );
      return result.rows.map(toTicket);
    },

    async get(input: { id: string }): Promise<Ticket | null> {
      requireOpen();
      if (!isPlainRecord(input)) validation('get input must be an object');
      const id = positiveId(input.id, 'id');
      const result = await pool.query<TicketRow>(`${selectTicket} WHERE id = $1`, [id]);
      const row = result.rows[0];
      return row === undefined ? null : toTicket(row);
    },

    async create(input): Promise<Ticket> {
      requireOpen();
      if (!isPlainRecord(input) || typeof input.title !== 'string') validation('title must be a string');
      if (!isStatus(input.status)) validation('status is invalid');
      const assignedTo = assignee(input.assignee);
      finiteInteger(input.priority, 'priority', 1, 5);
      const metadata = input.metadata ?? {};
      if (!isPlainRecord(metadata)) validation('metadata must be an object');
      const serializedMetadata = serializeMetadata(metadata);

      const result = await pool.query<TicketRow>(
        `INSERT INTO ${tickets} (title, status, assignee, priority, created_at, metadata)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5::jsonb)
         RETURNING id::text AS id, title, status::text AS status, assignee, priority, created_at, metadata`,
        [input.title, input.status, assignedTo, input.priority, serializedMetadata],
      );
      const row = result.rows[0];
      if (row === undefined) throw new Error('Database did not return the inserted ticket');
      return toTicket(row);
    },

    async assign(input): Promise<{ id: string; assignee: string | null }> {
      requireOpen();
      if (!isPlainRecord(input)) validation('assign input must be an object');
      const id = positiveId(input.id, 'id');
      const assignedTo = assignee(input.assignee);
      const client: PoolClient = await pool.connect();
      try {
        await client.query('BEGIN');
        const updated = await client.query<{ id: string; assignee: string | null }>(
          `UPDATE ${tickets} SET assignee = $1 WHERE id = $2 RETURNING id::text AS id, assignee`,
          [assignedTo, id],
        );
        if (updated.rows.length === 0) {
          await client.query('ROLLBACK');
          throw applicationError('NOT_FOUND', 'Ticket was not found');
        }
        await client.query(
          `INSERT INTO ${ticketAudit} (ticket_id, action, detail, created_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
          [id, 'assign', assignedTo === null ? 'unassigned' : assignedTo],
        );
        await client.query('COMMIT');
        const row = updated.rows[0];
        if (row === undefined) throw new Error('Database did not return the updated ticket');
        return row;
      } catch (error) {
        try {
          await client.query('ROLLBACK');
        } catch {
          // A failed or already-completed transaction has nothing left to roll back.
        }
        throw error;
      } finally {
        client.release();
      }
    },

    close(): Promise<void> {
      if (closing !== undefined) return closing;
      closed = true;
      closing = pool.end();
      return closing;
    },
  };
}
