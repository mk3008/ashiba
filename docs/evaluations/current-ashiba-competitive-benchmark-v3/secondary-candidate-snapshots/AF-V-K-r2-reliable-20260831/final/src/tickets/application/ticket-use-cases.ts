import { Generated, Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import type { Runtime } from '../../application.js';

type TicketStatus = 'open' | 'pending' | 'closed';
type TicketSort = 'id' | 'priority' | 'createdAt';
type Direction = 'asc' | 'desc';

interface TicketRow {
  id: Generated<string>;
  title: string;
  status: TicketStatus;
  assignee: string | null;
  priority: number;
  created_at: Date;
  metadata: unknown;
}

interface Database {
  tickets: TicketRow;
  ticket_audit: {
    audit_id: Generated<string>;
    ticket_id: string;
    action: string;
    detail: string;
    created_at: Date;
  };
}

type ErrorCode = 'VALIDATION' | 'NOT_FOUND' | 'APPLICATION_CLOSED';

function failure(code: ErrorCode, message: string): Error & { code: ErrorCode } {
  return Object.assign(new Error(message), { code });
}

function identifier(input: unknown): string {
  if (typeof input !== 'string' || !/^\d+$/.test(input) || BigInt(input) < 1n) {
    throw failure('VALIDATION', 'id must be a positive integer string');
  }
  return input;
}

function boundedInteger(input: unknown, fallback: number, min: number, max: number, label: string): number {
  const value = input === undefined ? fallback : input;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    throw failure('VALIDATION', `${label} is invalid`);
  }
  return value;
}

function ticket(row: Omit<TicketRow, 'id'> & { id: string }): {
  id: string; title: string; status: TicketStatus; assignee: string | null;
  priority: number; createdAt: string; metadata: Record<string, unknown>;
} {
  const candidate = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
  return {
    id: String(row.id),
    title: row.title,
    status: row.status,
    assignee: row.assignee,
    priority: row.priority,
    createdAt: new Date(row.created_at).toISOString(),
    metadata: candidate !== null && typeof candidate === 'object' && !Array.isArray(candidate)
      ? candidate as Record<string, unknown>
      : {},
  };
}

/** Feature-local Kysely implementation for the vertical ticket slice. */
export function createTicketApplication(runtime: Runtime) {
  const pool = new Pool({ connectionString: runtime.connectionString });
  const database = new Kysely<Database>({ dialect: new PostgresDialect({ pool }) });
  let isClosed = false;
  const assertOpen = (): void => {
    if (isClosed) throw failure('APPLICATION_CLOSED', 'application is closed');
  };

  return {
    async list(input: { status?: TicketStatus; assignee?: string | null; sort?: TicketSort; direction?: Direction; offset?: number; limit?: number } = {}) {
      assertOpen();
      const sort = input.sort ?? 'id';
      const direction = input.direction ?? 'asc';
      const fields: Record<TicketSort, 'id' | 'priority' | 'created_at'> = { id: 'id', priority: 'priority', createdAt: 'created_at' };
      if (!(sort in fields) || (direction !== 'asc' && direction !== 'desc')) {
        throw failure('VALIDATION', 'unknown finite sort option');
      }
      const offset = boundedInteger(input.offset, 0, 0, 10_000, 'offset');
      const limit = boundedInteger(input.limit, 100, 1, 100, 'limit');
      let query = database.selectFrom('tickets').select(['id', 'title', 'status', 'assignee', 'priority', 'created_at', 'metadata']);
      if (input.status !== undefined) {
        if (!['open', 'pending', 'closed'].includes(input.status)) throw failure('VALIDATION', 'invalid status');
        query = query.where('status', '=', input.status);
      }
      if (Object.hasOwn(input, 'assignee')) {
        if (input.assignee === null) query = query.where('assignee', 'is', null);
        else if (typeof input.assignee === 'string') query = query.where('assignee', '=', input.assignee);
        else throw failure('VALIDATION', 'invalid assignee');
      }
      return (await query.orderBy(fields[sort], direction).orderBy('id', 'asc').offset(offset).limit(limit).execute()).map(ticket);
    },

    async get(input: { id: string }) {
      assertOpen();
      const row = await database.selectFrom('tickets')
        .select(['id', 'title', 'status', 'assignee', 'priority', 'created_at', 'metadata'])
        .where('id', '=', identifier(input?.id))
        .executeTakeFirst();
      return row === undefined ? null : ticket(row);
    },

    async create(input: { title: string; status: TicketStatus; assignee: string | null; priority: number; metadata?: Record<string, unknown> }) {
      assertOpen();
      if (typeof input?.title !== 'string' || !['open', 'pending', 'closed'].includes(input.status) ||
        (input.assignee !== null && typeof input.assignee !== 'string') || !Number.isInteger(input.priority) || input.priority < 1 || input.priority > 5) {
        throw failure('VALIDATION', 'invalid create input');
      }
      const row = await database.insertInto('tickets').values({
        title: input.title, status: input.status, assignee: input.assignee,
        priority: input.priority, created_at: new Date(), metadata: JSON.stringify(input.metadata ?? {}),
      }).returning(['id', 'title', 'status', 'assignee', 'priority', 'created_at', 'metadata']).executeTakeFirstOrThrow();
      return ticket(row);
    },

    async assign(input: { id: string; assignee: string | null }) {
      assertOpen();
      const id = identifier(input?.id);
      if (input.assignee !== null && typeof input.assignee !== 'string') throw failure('VALIDATION', 'invalid assignee');
      return database.transaction().execute(async (trx) => {
        const row = await trx.updateTable('tickets').set({ assignee: input.assignee }).where('id', '=', id)
          .returning(['id', 'assignee']).executeTakeFirst();
        if (row === undefined) throw failure('NOT_FOUND', 'ticket not found');
        await trx.insertInto('ticket_audit').values({
          ticket_id: id, action: 'assigned', detail: input.assignee ?? 'unassigned', created_at: new Date(),
        }).execute();
        return { id: String(row.id), assignee: row.assignee };
      });
    },

    async close(): Promise<void> {
      if (isClosed) return;
      isClosed = true;
      await database.destroy();
    },
  };
}
