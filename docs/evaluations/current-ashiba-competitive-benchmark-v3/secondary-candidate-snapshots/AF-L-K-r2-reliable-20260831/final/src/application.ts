import { Generated, Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';

type TicketStatus = 'open' | 'pending' | 'closed';
type TicketSort = 'id' | 'priority' | 'createdAt';
type SortDirection = 'asc' | 'desc';

interface Runtime {
  connectionString: string;
  schema: string;
}

interface Ticket {
  id: string;
  title: string;
  status: TicketStatus;
  assignee: string | null;
  priority: number;
  createdAt: string;
  metadata: Record<string, unknown>;
}

interface Database {
  tickets: {
    id: Generated<string>;
    title: string;
    status: TicketStatus;
    assignee: string | null;
    priority: number;
    created_at: Date;
    metadata: unknown;
  };
  ticket_audit: {
    audit_id: Generated<string>;
    ticket_id: string;
    action: string;
    detail: string;
    created_at: Date;
  };
}

type ApplicationErrorCode = 'VALIDATION' | 'NOT_FOUND' | 'APPLICATION_CLOSED';

function applicationError(code: ApplicationErrorCode, message: string): Error & { code: ApplicationErrorCode } {
  return Object.assign(new Error(message), { code });
}

function parsePositiveId(value: unknown, name: string): string {
  if (typeof value !== 'string' || !/^\d+$/.test(value) || BigInt(value) <= 0n) {
    throw applicationError('VALIDATION', `${name} must be a positive integer string`);
  }
  return value;
}

function parsePagination(value: unknown, fallback: number, name: 'offset' | 'limit', min: number, max: number): number {
  const parsed = value === undefined ? fallback : value;
  if (!Number.isInteger(parsed) || typeof parsed !== 'number' || parsed < min || parsed > max) {
    throw applicationError('VALIDATION', `${name} is out of range`);
  }
  return parsed;
}

function parseTicket(row: {
  id: string;
  title: string;
  status: TicketStatus;
  assignee: string | null;
  priority: number;
  created_at: Date;
  metadata: unknown;
}): Ticket {
  const rawMetadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
  return {
    id: String(row.id),
    title: row.title,
    status: row.status,
    assignee: row.assignee,
    priority: row.priority,
    createdAt: new Date(row.created_at).toISOString(),
    metadata: rawMetadata !== null && typeof rawMetadata === 'object' && !Array.isArray(rawMetadata)
      ? rawMetadata as Record<string, unknown>
      : {},
  };
}

/** Candidate entrypoint for the ordinary layered application boundary. */
export function createApplication(runtime: Runtime) {
  // The runner gives the candidate role a nonce-schema search path, so this
  // normal Kysely/pg configuration keeps the application SQL schema-agnostic.
  const pool = new Pool({ connectionString: runtime.connectionString });
  const db = new Kysely<Database>({ dialect: new PostgresDialect({ pool }) });
  let closed = false;

  const ensureOpen = (): void => {
    if (closed) throw applicationError('APPLICATION_CLOSED', 'application is closed');
  };

  return {
    async list(input: {
      status?: TicketStatus;
      assignee?: string | null;
      sort?: TicketSort;
      direction?: SortDirection;
      offset?: number;
      limit?: number;
    } = {}): Promise<Ticket[]> {
      ensureOpen();
      const sort = input.sort ?? 'id';
      const direction = input.direction ?? 'asc';
      const sortColumns: Record<TicketSort, 'id' | 'priority' | 'created_at'> = {
        id: 'id', priority: 'priority', createdAt: 'created_at',
      };
      if (!(sort in sortColumns) || (direction !== 'asc' && direction !== 'desc')) {
        throw applicationError('VALIDATION', 'sort and direction must be reviewed finite values');
      }
      const offset = parsePagination(input.offset, 0, 'offset', 0, 10_000);
      const limit = parsePagination(input.limit, 100, 'limit', 1, 100);
      let query = db.selectFrom('tickets').select(['id', 'title', 'status', 'assignee', 'priority', 'created_at', 'metadata']);
      if (input.status !== undefined) {
        if (input.status !== 'open' && input.status !== 'pending' && input.status !== 'closed') {
          throw applicationError('VALIDATION', 'invalid status');
        }
        query = query.where('status', '=', input.status);
      }
      if (Object.hasOwn(input, 'assignee')) {
        query = input.assignee === null
          ? query.where('assignee', 'is', null)
          : typeof input.assignee === 'string'
            ? query.where('assignee', '=', input.assignee)
            : (() => { throw applicationError('VALIDATION', 'invalid assignee'); })();
      }
      const rows = await query
        .orderBy(sortColumns[sort], direction)
        .orderBy('id', 'asc')
        .offset(offset)
        .limit(limit)
        .execute();
      return rows.map(parseTicket);
    },

    async get(input: { id: string }): Promise<Ticket | null> {
      ensureOpen();
      const id = parsePositiveId(input?.id, 'id');
      const row = await db.selectFrom('tickets')
        .select(['id', 'title', 'status', 'assignee', 'priority', 'created_at', 'metadata'])
        .where('id', '=', id)
        .executeTakeFirst();
      return row === undefined ? null : parseTicket(row);
    },

    async create(input: { title: string; status: TicketStatus; assignee: string | null; priority: number; metadata?: Record<string, unknown> }): Promise<Ticket> {
      ensureOpen();
      if (typeof input?.title !== 'string' || !['open', 'pending', 'closed'].includes(input.status) ||
        (input.assignee !== null && typeof input.assignee !== 'string') || !Number.isInteger(input.priority) || input.priority < 1 || input.priority > 5) {
        throw applicationError('VALIDATION', 'invalid ticket input');
      }
      const row = await db.insertInto('tickets')
        .values({
          title: input.title,
          status: input.status,
          assignee: input.assignee,
          priority: input.priority,
          created_at: new Date(),
          metadata: JSON.stringify(input.metadata ?? {}),
        })
        .returning(['id', 'title', 'status', 'assignee', 'priority', 'created_at', 'metadata'])
        .executeTakeFirstOrThrow();
      return parseTicket(row);
    },

    async assign(input: { id: string; assignee: string | null }): Promise<{ id: string; assignee: string | null }> {
      ensureOpen();
      const id = parsePositiveId(input?.id, 'id');
      if (input.assignee !== null && typeof input.assignee !== 'string') {
        throw applicationError('VALIDATION', 'invalid assignee');
      }
      return db.transaction().execute(async (trx) => {
        const updated = await trx.updateTable('tickets')
          .set({ assignee: input.assignee })
          .where('id', '=', id)
          .returning(['id', 'assignee'])
          .executeTakeFirst();
        if (updated === undefined) throw applicationError('NOT_FOUND', 'ticket not found');
        await trx.insertInto('ticket_audit').values({
          ticket_id: id,
          action: 'assigned',
          detail: input.assignee ?? 'unassigned',
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
