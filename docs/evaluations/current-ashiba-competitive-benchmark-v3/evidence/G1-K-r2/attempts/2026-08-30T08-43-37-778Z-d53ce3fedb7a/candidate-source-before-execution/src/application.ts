import { Generated, Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';

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

interface TicketTable {
  id: Generated<string>;
  title: string;
  status: TicketStatus;
  assignee: string | null;
  priority: number;
  created_at: Date | string;
  metadata: Record<string, unknown> | string;
}

type TicketRow = Omit<TicketTable, 'id'> & { id: string };

interface TicketAuditTable {
  ticket_id: string;
  action: string;
  detail: string;
  created_at: Date;
}

interface Database {
  tickets: TicketTable;
  ticket_audit: TicketAuditTable;
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
  const db = new Kysely<Database>({ dialect: new PostgresDialect({ pool }) }).withSchema(runtime.schema);
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

      let query = db.selectFrom('tickets').selectAll();
      if (status !== undefined) query = query.where('status', '=', status);
      if (assignee !== undefined) query = assignee === null
        ? query.where('assignee', 'is', null)
        : query.where('assignee', '=', assignee);
      const rows = await query
        .orderBy(sorts[sort], direction)
        .orderBy('id', 'asc')
        .offset(offset)
        .limit(limit)
        .execute();
      return rows.map(toTicket);
    },

    async get(input: { id: string }): Promise<Ticket | null> {
      ensureOpen();
      if (input === null || typeof input !== 'object' || Array.isArray(input)) validation('get input must be an object');
      const id = requirePositiveId(input.id, 'id');
      const row = await db.selectFrom('tickets').selectAll().where('id', '=', id).executeTakeFirst();
      return row === undefined ? null : toTicket(row);
    },

    async create(input: CreateInput): Promise<Ticket> {
      ensureOpen();
      if (input === null || typeof input !== 'object' || Array.isArray(input) || typeof input.title !== 'string') validation('title must be a string');
      if (!statuses.has(input.status)) validation('invalid status');
      const assignee = requireNullableString(input.assignee, 'assignee');
      if (!Number.isInteger(input.priority) || input.priority < 1 || input.priority > 5) validation('invalid priority');
      const metadata = input.metadata === undefined ? {} : requireJsonObject(input.metadata);
      const row = await db
        .insertInto('tickets')
        .values({ title: input.title, status: input.status, assignee, priority: input.priority, metadata, created_at: new Date() })
        .returningAll()
        .executeTakeFirstOrThrow();
      return toTicket(row);
    },

    async assign(input: { id: string; assignee: string | null }): Promise<{ id: string; assignee: string | null }> {
      ensureOpen();
      if (input === null || typeof input !== 'object' || Array.isArray(input)) validation('assign input must be an object');
      const id = requirePositiveId(input.id, 'id');
      const assignee = requireNullableString(input.assignee, 'assignee');
      return db.transaction().execute(async (trx) => {
        const updated = await trx
          .updateTable('tickets')
          .set({ assignee })
          .where('id', '=', id)
          .returning(['id', 'assignee'])
          .executeTakeFirst();
        if (updated === undefined) throw applicationError('NOT_FOUND', 'ticket not found');
        await trx.insertInto('ticket_audit').values({
          ticket_id: updated.id,
          action: 'assign',
          detail: JSON.stringify({ assignee }),
          created_at: new Date(),
        }).execute();
        return { id: String(updated.id), assignee: updated.assignee };
      });
    },

    async close(): Promise<void> {
      if (closed) return;
      closed = true;
      await db.destroy();
    },
  };
}
