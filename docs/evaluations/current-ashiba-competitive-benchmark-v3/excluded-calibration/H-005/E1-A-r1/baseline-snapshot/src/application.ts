import { bindNamedParameters, type ParameterBinding } from '@ashiba-ts/named-parameters';
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
  list(input?: ListInput): Promise<Ticket[]>;
  get(input: { id: string }): Promise<Ticket | null>;
  create(input: CreateInput): Promise<Ticket>;
  assign(input: AssignInput): Promise<{ id: string; assignee: string | null }>;
  close(): Promise<void>;
}

type ListInput = {
  status?: TicketStatus;
  assignee?: string | null;
  sort?: TicketSort;
  direction?: SortDirection;
  offset?: number;
  limit?: number;
};

type CreateInput = {
  title: string;
  status: TicketStatus;
  assignee: string | null;
  priority: number;
  metadata?: Record<string, unknown>;
};

type AssignInput = {
  id: string;
  assignee: string | null;
};

type TicketRow = QueryResultRow & {
  id: string;
  title: string;
  status: TicketStatus;
  assignee: string | null;
  priority: number;
  created_at: Date | string;
  metadata: Record<string, unknown>;
};

const MAX_BIGINT = 9_223_372_036_854_775_807n;
const STATUSES = new Set<TicketStatus>(['open', 'pending', 'closed']);
const SORTS = new Set<TicketSort>(['id', 'priority', 'createdAt']);
const DIRECTIONS = new Set<SortDirection>(['asc', 'desc']);

const TICKET_COLUMNS = `
  id::text AS id,
  title,
  status::text AS status,
  assignee,
  priority,
  created_at,
  metadata`;

const LIST_SQL: Record<TicketSort, Record<SortDirection, ParameterBinding>> = {
  id: {
    asc: compileNamedParameters(`SELECT ${TICKET_COLUMNS}
      FROM tickets
      WHERE (:status::ticket_status IS NULL OR status = :status::ticket_status)
        AND (:hasAssigneeFilter::boolean = false OR assignee IS NOT DISTINCT FROM :assignee::text)
      ORDER BY id ASC
      LIMIT :limit::integer OFFSET :offset::integer`),
    desc: compileNamedParameters(`SELECT ${TICKET_COLUMNS}
      FROM tickets
      WHERE (:status::ticket_status IS NULL OR status = :status::ticket_status)
        AND (:hasAssigneeFilter::boolean = false OR assignee IS NOT DISTINCT FROM :assignee::text)
      ORDER BY id DESC, id ASC
      LIMIT :limit::integer OFFSET :offset::integer`),
  },
  priority: {
    asc: compileNamedParameters(`SELECT ${TICKET_COLUMNS}
      FROM tickets
      WHERE (:status::ticket_status IS NULL OR status = :status::ticket_status)
        AND (:hasAssigneeFilter::boolean = false OR assignee IS NOT DISTINCT FROM :assignee::text)
      ORDER BY priority ASC, id ASC
      LIMIT :limit::integer OFFSET :offset::integer`),
    desc: compileNamedParameters(`SELECT ${TICKET_COLUMNS}
      FROM tickets
      WHERE (:status::ticket_status IS NULL OR status = :status::ticket_status)
        AND (:hasAssigneeFilter::boolean = false OR assignee IS NOT DISTINCT FROM :assignee::text)
      ORDER BY priority DESC, id ASC
      LIMIT :limit::integer OFFSET :offset::integer`),
  },
  createdAt: {
    asc: compileNamedParameters(`SELECT ${TICKET_COLUMNS}
      FROM tickets
      WHERE (:status::ticket_status IS NULL OR status = :status::ticket_status)
        AND (:hasAssigneeFilter::boolean = false OR assignee IS NOT DISTINCT FROM :assignee::text)
      ORDER BY created_at ASC, id ASC
      LIMIT :limit::integer OFFSET :offset::integer`),
    desc: compileNamedParameters(`SELECT ${TICKET_COLUMNS}
      FROM tickets
      WHERE (:status::ticket_status IS NULL OR status = :status::ticket_status)
        AND (:hasAssigneeFilter::boolean = false OR assignee IS NOT DISTINCT FROM :assignee::text)
      ORDER BY created_at DESC, id ASC
      LIMIT :limit::integer OFFSET :offset::integer`),
  },
};

const GET_SQL = compileNamedParameters(`SELECT ${TICKET_COLUMNS}
  FROM tickets WHERE id = :id::bigint`);
const CREATE_SQL = compileNamedParameters(`INSERT INTO tickets
  (title, status, assignee, priority, created_at, metadata)
  VALUES (:title::text, :status::ticket_status, :assignee::text, :priority::integer, CURRENT_TIMESTAMP, :metadata::jsonb)
  RETURNING ${TICKET_COLUMNS}`);
const ASSIGN_SQL = compileNamedParameters(`UPDATE tickets
  SET assignee = :assignee::text
  WHERE id = :id::bigint
  RETURNING id::text AS id, assignee`);
const AUDIT_SQL = compileNamedParameters(`INSERT INTO ticket_audit
  (ticket_id, action, detail, created_at)
  VALUES (:ticketId::bigint, 'assign', :detail::text, CURRENT_TIMESTAMP)`);

function applicationError(code: ApplicationError['code'], message: string): ApplicationError {
  const error = new Error(message) as ApplicationError;
  error.code = code;
  return error;
}

function validation(message: string): never {
  throw applicationError('VALIDATION', message);
}

function positiveBigintString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    return validation(`${field} must be a positive base-10 integer string`);
  }
  const parsed = BigInt(value);
  if (parsed < 1n || parsed > MAX_BIGINT) {
    return validation(`${field} is out of range`);
  }
  return value;
}

function ticketStatus(value: unknown, field: string): TicketStatus {
  if (typeof value !== 'string' || !STATUSES.has(value as TicketStatus)) {
    return validation(`${field} must be a ticket status`);
  }
  return value as TicketStatus;
}

function nullableText(value: unknown, field: string): string | null {
  if (value !== null && typeof value !== 'string') {
    return validation(`${field} must be a string or null`);
  }
  return value;
}

function jsonObject(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return validation('metadata must be an object');
  }
  try {
    JSON.stringify(value);
  } catch {
    return validation('metadata must be JSON serializable');
  }
  return value as Record<string, unknown>;
}

function mapTicket(row: TicketRow): Ticket {
  const timestamp = row.created_at instanceof Date ? row.created_at : new Date(row.created_at);
  return {
    id: String(row.id),
    title: row.title,
    status: ticketStatus(row.status, 'database status'),
    assignee: row.assignee,
    priority: row.priority,
    createdAt: timestamp.toISOString(),
    metadata: row.metadata,
  };
}

function validateList(input: ListInput | undefined): Required<Pick<ListInput, 'sort' | 'direction' | 'offset' | 'limit'>> & Pick<ListInput, 'status' | 'assignee'> & { hasAssigneeFilter: boolean } {
  if (input !== undefined && (input === null || typeof input !== 'object' || Array.isArray(input))) {
    return validation('list input must be an object');
  }
  const candidate = input ?? {};
  if (candidate.status !== undefined) {
    ticketStatus(candidate.status, 'status');
  }
  if (candidate.assignee !== undefined) {
    nullableText(candidate.assignee, 'assignee');
  }
  const sort = candidate.sort ?? 'id';
  const direction = candidate.direction ?? 'asc';
  if (!SORTS.has(sort)) {
    return validation('sort is unsupported');
  }
  if (!DIRECTIONS.has(direction)) {
    return validation('direction is unsupported');
  }
  const offset = candidate.offset ?? 0;
  const limit = candidate.limit ?? 100;
  if (!Number.isInteger(offset) || offset < 0 || offset > 10_000) {
    return validation('offset must be an integer from 0 through 10000');
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return validation('limit must be an integer from 1 through 100');
  }
  return {
    status: candidate.status,
    assignee: candidate.assignee,
    hasAssigneeFilter: candidate.assignee !== undefined,
    sort,
    direction,
    offset,
    limit,
  };
}

async function rollbackQuietly(client: PoolClient): Promise<void> {
  try {
    await client.query('ROLLBACK');
  } catch {
    // Preserve the original operation error when rollback is no longer possible.
  }
}

export function createApplication(runtime: Runtime): Application {
  const pool = new Pool({ connectionString: runtime.connectionString });
  let closed = false;
  let closePromise: Promise<void> | undefined;

  function ensureOpen(): void {
    if (closed) {
      throw applicationError('APPLICATION_CLOSED', 'application is closed');
    }
  }

  return {
    async list(input?: ListInput): Promise<Ticket[]> {
      ensureOpen();
      const options = validateList(input);
      const statement = LIST_SQL[options.sort][options.direction];
      const query = bindNamedParameters(statement, {
        status: options.status ?? null,
        hasAssigneeFilter: options.hasAssigneeFilter,
        assignee: options.assignee ?? null,
        limit: options.limit,
        offset: options.offset,
      });
      const result = await pool.query<TicketRow>(query.sql, query.values as unknown[]);
      return result.rows.map(mapTicket);
    },

    async get(input: { id: string }): Promise<Ticket | null> {
      ensureOpen();
      const id = positiveBigintString(input?.id, 'id');
      const query = bindNamedParameters(GET_SQL, { id });
      const result = await pool.query<TicketRow>(query.sql, query.values as unknown[]);
      return result.rows[0] === undefined ? null : mapTicket(result.rows[0]);
    },

    async create(input: CreateInput): Promise<Ticket> {
      ensureOpen();
      if (input === null || typeof input !== 'object' || Array.isArray(input)) {
        return validation('create input must be an object');
      }
      if (typeof input.title !== 'string') {
        return validation('title must be a string');
      }
      const status = ticketStatus(input.status, 'status');
      const assignee = nullableText(input.assignee, 'assignee');
      if (!Number.isInteger(input.priority) || input.priority < 1 || input.priority > 5) {
        return validation('priority must be an integer from 1 through 5');
      }
      const metadata = input.metadata === undefined ? {} : jsonObject(input.metadata);
      const query = bindNamedParameters(CREATE_SQL, {
        title: input.title,
        status,
        assignee,
        priority: input.priority,
        metadata,
      });
      const result = await pool.query<TicketRow>(query.sql, query.values as unknown[]);
      return mapTicket(result.rows[0]);
    },

    async assign(input: AssignInput): Promise<{ id: string; assignee: string | null }> {
      ensureOpen();
      if (input === null || typeof input !== 'object' || Array.isArray(input)) {
        return validation('assign input must be an object');
      }
      const id = positiveBigintString(input.id, 'id');
      const assignee = nullableText(input.assignee, 'assignee');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const update = bindNamedParameters(ASSIGN_SQL, { id, assignee });
        const updated = await client.query<{ id: string; assignee: string | null }>(update.sql, update.values as unknown[]);
        const row = updated.rows[0];
        if (row === undefined) {
          await client.query('ROLLBACK');
          throw applicationError('NOT_FOUND', 'ticket was not found');
        }
        const audit = bindNamedParameters(AUDIT_SQL, {
          ticketId: id,
          detail: JSON.stringify({ assignee }),
        });
        await client.query(audit.sql, audit.values as unknown[]);
        await client.query('COMMIT');
        return { id: String(row.id), assignee: row.assignee };
      } catch (error) {
        await rollbackQuietly(client);
        throw error;
      } finally {
        client.release();
      }
    },

    async close(): Promise<void> {
      if (closePromise === undefined) {
        closed = true;
        closePromise = pool.end();
      }
      await closePromise;
    },
  };
}
