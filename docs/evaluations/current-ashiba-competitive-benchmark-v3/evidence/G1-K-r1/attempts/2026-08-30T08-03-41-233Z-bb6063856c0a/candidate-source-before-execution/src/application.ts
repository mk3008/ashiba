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
  code: 'VALIDATION' | 'NOT_FOUND' | 'APPLICATION_CLOSED';
}

interface TicketsTable {
  id: Generated<string>;
  title: string;
  status: TicketStatus;
  assignee: string | null;
  priority: number;
  created_at: string;
  metadata: Record<string, unknown>;
}

interface TicketAuditTable {
  audit_id: Generated<string>;
  ticket_id: string;
  action: string;
  detail: string;
  created_at: string;
}

interface Database {
  tickets: TicketsTable;
  ticket_audit: TicketAuditTable;
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

type ParsedCreateInput = Omit<CreateInput, 'metadata'> & {
  metadata: Record<string, unknown>;
};

const STATUSES = new Set<TicketStatus>(['open', 'pending', 'closed']);
const SORTS = new Set<TicketSort>(['id', 'priority', 'createdAt']);
const DIRECTIONS = new Set<SortDirection>(['asc', 'desc']);
const SORT_COLUMNS: Record<TicketSort, 'tickets.id' | 'tickets.priority' | 'tickets.created_at'> = {
  id: 'tickets.id',
  priority: 'tickets.priority',
  createdAt: 'tickets.created_at',
};

function applicationError(code: ApplicationError['code'], message: string): ApplicationError {
  const error = new Error(message) as ApplicationError;
  error.code = code;
  return error;
}

function validation(message: string): never {
  throw applicationError('VALIDATION', message);
}

function notFound(): never {
  throw applicationError('NOT_FOUND', 'Ticket not found');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isJsonValue(value: unknown, seen: Set<object>): boolean {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return true;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value);
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) return false;
    seen.add(value);
    const valid = value.every((item) => isJsonValue(item, seen));
    seen.delete(value);
    return valid;
  }
  if (isRecord(value)) {
    if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) return false;
    if (seen.has(value)) return false;
    seen.add(value);
    const valid = Object.values(value).every((item) => isJsonValue(item, seen));
    seen.delete(value);
    return valid;
  }
  return false;
}

function parsePositiveId(value: unknown, name: string): string {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    validation(`${name} must be a positive base-10 integer string`);
  }
  return value;
}

function parseStatus(value: unknown): TicketStatus {
  if (typeof value !== 'string' || !STATUSES.has(value as TicketStatus)) {
    validation('status is invalid');
  }
  return value as TicketStatus;
}

function parseAssignee(value: unknown): string | null {
  if (value !== null && typeof value !== 'string') {
    validation('assignee must be a string or null');
  }
  return value;
}

function parseListInput(value: unknown): Required<ListInput> {
  if (value === undefined) {
    return { status: undefined as never, assignee: undefined as never, sort: 'id', direction: 'asc', offset: 0, limit: 100 };
  }
  if (!isRecord(value)) validation('list input must be an object');

  const input = value as ListInput;
  if (input.status !== undefined) parseStatus(input.status);
  if (input.assignee !== undefined) parseAssignee(input.assignee);
  const sort = input.sort ?? 'id';
  const direction = input.direction ?? 'asc';
  const offset = input.offset ?? 0;
  const limit = input.limit ?? 100;
  if (!SORTS.has(sort)) validation('sort is invalid');
  if (!DIRECTIONS.has(direction)) validation('direction is invalid');
  if (!Number.isInteger(offset) || offset < 0 || offset > 10_000) validation('offset is invalid');
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) validation('limit is invalid');
  return { status: input.status as TicketStatus, assignee: input.assignee as string | null, sort, direction, offset, limit };
}

function parseCreateInput(value: unknown): ParsedCreateInput {
  if (!isRecord(value)) validation('create input must be an object');
  const input = value as Partial<CreateInput>;
  if (typeof input.title !== 'string') validation('title must be a string');
  const status = parseStatus(input.status);
  const assignee = parseAssignee(input.assignee);
  if (typeof input.priority !== 'number' || !Number.isInteger(input.priority) || input.priority < 1 || input.priority > 5) validation('priority is invalid');
  const metadata = input.metadata ?? {};
  if (!isRecord(metadata) || !isJsonValue(metadata, new Set<object>())) validation('metadata must be JSON-safe object data');
  return { title: input.title, status, assignee, priority: input.priority, metadata };
}

function toTicket(row: {
  id: string;
  title: string;
  status: TicketStatus;
  assignee: string | null;
  priority: number;
  created_at: string | Date;
  metadata: Record<string, unknown>;
}): Ticket {
  return {
    id: String(row.id),
    title: row.title,
    status: row.status,
    assignee: row.assignee,
    priority: row.priority,
    createdAt: new Date(row.created_at).toISOString(),
    metadata: row.metadata,
  };
}

export function createApplication(runtime: Runtime) {
  const pool = new Pool({ connectionString: runtime.connectionString });
  const db = new Kysely<Database>({ dialect: new PostgresDialect({ pool }) });
  let closed = false;
  let closing: Promise<void> | undefined;

  const ensureOpen = () => {
    if (closed) throw applicationError('APPLICATION_CLOSED', 'Application is closed');
  };

  return {
    async list(input?: ListInput): Promise<Ticket[]> {
      ensureOpen();
      const parsed = parseListInput(input);
      let query = db.selectFrom('tickets').select(['id', 'title', 'status', 'assignee', 'priority', 'created_at', 'metadata']);
      if (parsed.status !== undefined) query = query.where('status', '=', parsed.status);
      if (parsed.assignee !== undefined) query = query.where('assignee', '=', parsed.assignee);
      const rows = await query
        .orderBy(SORT_COLUMNS[parsed.sort], parsed.direction)
        .orderBy('tickets.id', 'asc')
        .offset(parsed.offset)
        .limit(parsed.limit)
        .execute();
      return rows.map(toTicket);
    },

    async get(input: { id: string }): Promise<Ticket | null> {
      ensureOpen();
      if (!isRecord(input)) validation('get input must be an object');
      const id = parsePositiveId(input.id, 'id');
      const row = await db.selectFrom('tickets')
        .select(['id', 'title', 'status', 'assignee', 'priority', 'created_at', 'metadata'])
        .where('id', '=', id)
        .executeTakeFirst();
      return row ? toTicket(row) : null;
    },

    async create(input: CreateInput): Promise<Ticket> {
      ensureOpen();
      const parsed = parseCreateInput(input);
      const row = await db.insertInto('tickets')
        .values({ ...parsed, created_at: new Date().toISOString() })
        .returning(['id', 'title', 'status', 'assignee', 'priority', 'created_at', 'metadata'])
        .executeTakeFirstOrThrow();
      return toTicket(row);
    },

    async assign(input: { id: string; assignee: string | null }): Promise<{ id: string; assignee: string | null }> {
      ensureOpen();
      if (!isRecord(input)) validation('assign input must be an object');
      const id = parsePositiveId(input.id, 'id');
      const assignee = parseAssignee(input.assignee);
      return db.transaction().execute(async (trx) => {
        const row = await trx.updateTable('tickets')
          .set({ assignee })
          .where('id', '=', id)
          .returning(['id', 'assignee'])
          .executeTakeFirst();
        if (!row) notFound();
        await trx.insertInto('ticket_audit')
          .values({
            ticket_id: row.id,
            action: 'assign',
            detail: JSON.stringify({ assignee }),
            created_at: new Date().toISOString(),
          })
          .execute();
        return { id: String(row.id), assignee: row.assignee };
      });
    },

    async close(): Promise<void> {
      if (closed) return;
      if (!closing) {
        closing = db.destroy().then(() => {
          closed = true;
        });
      }
      return closing;
    },
  };
}
