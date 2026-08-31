import { bindNamedParameters } from '@ashiba-ts/named-parameters';
import { compileNamedParameters } from '@ashiba-ts/named-parameters/compiler';
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

class ApplicationException extends Error implements ApplicationError {
  readonly code: ApplicationError['code'];

  constructor(code: ApplicationError['code'], message: string) {
    super(message);
    this.name = 'ApplicationError';
    this.code = code;
  }
}

interface TicketRow extends QueryResultRow {
  id: string;
  title: string;
  status: TicketStatus;
  assignee: string | null;
  priority: number;
  created_at: Date | string;
  metadata: Record<string, unknown>;
}

interface AssignmentRow extends QueryResultRow {
  id: string;
  assignee: string | null;
}

const SORT_COLUMNS: Record<TicketSort, string> = {
  id: 'id',
  priority: 'priority',
  createdAt: 'created_at',
};

const DIRECTIONS: Record<SortDirection, 'ASC' | 'DESC'> = {
  asc: 'ASC',
  desc: 'DESC',
};

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function validation(message: string): ApplicationException {
  return new ApplicationException('VALIDATION', message);
}

function assertRecord(value: unknown, field: string): asserts value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw validation(`${field} must be an object`);
  }
}

function assertPositiveIntegerString(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || !/^[1-9][0-9]*$/.test(value)) {
    throw validation(`${field} must be a positive base-10 integer string`);
  }
}

function assertStatus(value: unknown, field = 'status'): asserts value is TicketStatus {
  if (value !== 'open' && value !== 'pending' && value !== 'closed') {
    throw validation(`${field} is unsupported`);
  }
}

function assertAssignee(value: unknown, field = 'assignee'): asserts value is string | null {
  if (value !== null && typeof value !== 'string') {
    throw validation(`${field} must be a string or null`);
  }
}

function assertMetadata(value: unknown): asserts value is Record<string, unknown> {
  assertRecord(value, 'metadata');
  try {
    const encoded = JSON.stringify(value);
    if (encoded === undefined) throw new Error('not JSON');
  } catch {
    throw validation('metadata must be JSON-safe');
  }
}

function mapTicket(row: TicketRow): Ticket {
  const date = row.created_at instanceof Date ? row.created_at : new Date(row.created_at);
  return {
    id: String(row.id),
    title: row.title,
    status: row.status,
    assignee: row.assignee,
    priority: Number(row.priority),
    createdAt: date.toISOString(),
    metadata: row.metadata,
  };
}

export function createApplication(runtime: Runtime): Application {
  const schema = quoteIdentifier(runtime.schema);
  const pool = new Pool({ connectionString: runtime.connectionString });
  let closed = false;
  let closePromise: Promise<void> | undefined;

  function ensureOpen(): void {
    if (closed) throw new ApplicationException('APPLICATION_CLOSED', 'application is closed');
  }

  async function query<T extends QueryResultRow>(
    client: PoolClient,
    sourceSql: string,
    params: Record<string, unknown> = {},
  ): Promise<T[]> {
    const statement = compileNamedParameters(sourceSql);
    const bound = bindNamedParameters(statement, params);
    const result = await client.query<T>(bound.sql, [...bound.values]);
    return result.rows;
  }

  async function withClient<T>(operation: (client: PoolClient) => Promise<T>): Promise<T> {
    ensureOpen();
    const client = await pool.connect();
    try {
      return await operation(client);
    } finally {
      client.release();
    }
  }

  async function inTransaction<T>(operation: (client: PoolClient) => Promise<T>): Promise<T> {
    return withClient(async (client) => {
      await query(client, 'BEGIN');
      try {
        const result = await operation(client);
        await query(client, 'COMMIT');
        return result;
      } catch (error) {
        try {
          await query(client, 'ROLLBACK');
        } catch {
          // Preserve the mutation error when rollback itself cannot be issued.
        }
        throw error;
      }
    });
  }

  return {
    async list(input = {}): Promise<Ticket[]> {
      ensureOpen();
      assertRecord(input, 'input');
      if (input.status !== undefined) assertStatus(input.status);
      if (input.assignee !== undefined) assertAssignee(input.assignee);

      const sort = input.sort ?? 'id';
      if (!Object.hasOwn(SORT_COLUMNS, sort)) throw validation('sort is unsupported');
      const direction = input.direction ?? 'asc';
      if (!Object.hasOwn(DIRECTIONS, direction)) throw validation('direction is unsupported');

      const offset = input.offset ?? 0;
      if (!Number.isInteger(offset) || offset < 0 || offset > 10_000) {
        throw validation('offset is out of range');
      }
      const limit = input.limit ?? 100;
      if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
        throw validation('limit is out of range');
      }

      const rows = await withClient((client) => query<TicketRow>(client, `
        SELECT id::text AS id, title, status::text AS status, assignee, priority,
               created_at, metadata
          FROM ${schema}.tickets
         WHERE (:status IS NULL OR status = CAST(:status AS ${schema}.ticket_status))
           AND (:assigneeFilter = false OR assignee IS NOT DISTINCT FROM :assignee)
         ORDER BY ${SORT_COLUMNS[sort]} ${DIRECTIONS[direction]}, id ASC
         LIMIT :limit OFFSET :offset
      `, {
        status: input.status ?? null,
        assigneeFilter: input.assignee !== undefined,
        assignee: input.assignee ?? null,
        limit,
        offset,
      }));
      return rows.map(mapTicket);
    },

    async get(input): Promise<Ticket | null> {
      ensureOpen();
      assertRecord(input, 'input');
      assertPositiveIntegerString(input.id, 'id');
      const rows = await withClient((client) => query<TicketRow>(client, `
        SELECT id::text AS id, title, status::text AS status, assignee, priority,
               created_at, metadata
          FROM ${schema}.tickets
         WHERE id = :id
      `, { id: input.id }));
      return rows.length === 0 ? null : mapTicket(rows[0]);
    },

    async create(input): Promise<Ticket> {
      ensureOpen();
      assertRecord(input, 'input');
      if (typeof input.title !== 'string') throw validation('title must be a string');
      assertStatus(input.status);
      assertAssignee(input.assignee);
      if (!Number.isInteger(input.priority) || input.priority < 1 || input.priority > 5) {
        throw validation('priority is out of range');
      }
      const metadata = input.metadata ?? {};
      assertMetadata(metadata);
      const rows = await withClient((client) => query<TicketRow>(client, `
        INSERT INTO ${schema}.tickets
          (title, status, assignee, priority, created_at, metadata)
        VALUES
          (:title, CAST(:status AS ${schema}.ticket_status), :assignee,
           :priority, CURRENT_TIMESTAMP, CAST(:metadata AS jsonb))
        RETURNING id::text AS id, title, status::text AS status, assignee,
                  priority, created_at, metadata
      `, {
        title: input.title,
        status: input.status,
        assignee: input.assignee,
        priority: input.priority,
        metadata: JSON.stringify(metadata),
      }));
      return mapTicket(rows[0]);
    },

    async assign(input): Promise<{ id: string; assignee: string | null }> {
      ensureOpen();
      assertRecord(input, 'input');
      assertPositiveIntegerString(input.id, 'id');
      assertAssignee(input.assignee);
      return inTransaction(async (client) => {
        const rows = await query<AssignmentRow>(client, `
          UPDATE ${schema}.tickets
             SET assignee = :assignee
           WHERE id = :id
           RETURNING id::text AS id, assignee
        `, { id: input.id, assignee: input.assignee });
        if (rows.length === 0) {
          throw new ApplicationException('NOT_FOUND', 'ticket not found');
        }
        await query(client, `
          INSERT INTO ${schema}.ticket_audit (ticket_id, action, detail, created_at)
          VALUES (:id, 'assign', :detail, CURRENT_TIMESTAMP)
        `, {
          id: input.id,
          detail: input.assignee ?? 'unassigned',
        });
        return { id: String(rows[0].id), assignee: rows[0].assignee };
      });
    },

    async close(): Promise<void> {
      if (closePromise) return closePromise;
      closed = true;
      closePromise = pool.end().then(() => undefined);
      return closePromise;
    },
  };
}
