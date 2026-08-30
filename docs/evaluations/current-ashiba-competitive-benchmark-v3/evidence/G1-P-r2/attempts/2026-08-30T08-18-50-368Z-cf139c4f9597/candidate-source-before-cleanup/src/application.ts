import postgres from '@prisma/orm-postgres/runtime';
import { defineContract } from '@prisma/orm-postgres/contract-builder';

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

type Row = Record<string, unknown>;
// The raw lane's generated codec map is intentionally opaque here: the runner
// owns the database schema and this workload has no emitted Prisma contract.
type RawClient = any;

const contract = defineContract({});
const statuses = new Set<TicketStatus>(['open', 'pending', 'closed']);
const sorts = new Set<TicketSort>(['id', 'priority', 'createdAt']);
const directions = new Set<SortDirection>(['asc', 'desc']);

function applicationError(code: ApplicationError['code'], message: string): ApplicationError {
  return Object.assign(new Error(message), { code }) as ApplicationError;
}

function validation(message: string): never {
  throw applicationError('VALIDATION', message);
}

function positiveIntegerString(value: unknown, name: string): string {
  if (typeof value !== 'string' || !/^[1-9][0-9]*$/.test(value)) {
    return validation(`${name} must be a positive base-10 integer string`);
  }
  return value;
}

function integerInRange(value: unknown, name: string, minimum: number, maximum: number, fallback?: number): number {
  if (value === undefined && fallback !== undefined) return fallback;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < minimum || value > maximum) {
    return validation(`${name} must be an integer between ${minimum} and ${maximum}`);
  }
  return value;
}

function textOrNull(value: unknown, name: string): string | null {
  if (value !== null && typeof value !== 'string') return validation(`${name} must be a string or null`);
  return value;
}

function jsonRecord(value: unknown, name: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return validation(`${name} must be an object`);
  }
  try {
    JSON.stringify(value);
  } catch {
    return validation(`${name} must be JSON-serializable`);
  }
  return value as Record<string, unknown>;
}

function ticketFromRow(row: Row): Ticket {
  const status = row.status;
  if (typeof row.id !== 'string' || typeof row.title !== 'string' || !statuses.has(status as TicketStatus) ||
    (row.assignee !== null && typeof row.assignee !== 'string') || typeof row.priority !== 'number' ||
    typeof row.created_at !== 'string' || row.metadata === null || typeof row.metadata !== 'object' || Array.isArray(row.metadata)) {
    throw new Error('Prisma returned an invalid ticket row');
  }
  return {
    id: row.id,
    title: row.title,
    status: status as TicketStatus,
    assignee: row.assignee as string | null,
    priority: row.priority,
    createdAt: row.created_at,
    metadata: row.metadata as Record<string, unknown>,
  };
}

function raw(client: RawClient): any {
  return client.raw.sql as any;
}

function ticketRows(client: RawClient): any {
  return (strings: TemplateStringsArray, ...values: unknown[]) => raw(client)(strings, ...values).returnsRow({
    id: 'pg/text@1',
    title: 'pg/text@1',
    status: 'pg/text@1',
    assignee: { codecId: 'pg/text@1', nullable: true },
    priority: 'pg/int4@1',
    created_at: 'pg/text@1',
    metadata: 'pg/jsonb@1',
  }).build();
}

function assignmentRows(client: RawClient): any {
  return (strings: TemplateStringsArray, ...values: unknown[]) => raw(client)(strings, ...values).returnsRow({
    id: 'pg/text@1',
    assignee: { codecId: 'pg/text@1', nullable: true },
  }).build();
}

async function queryRows(client: RawClient, plan: any): Promise<Row[]> {
  const rows: Row[] = [];
  for await (const row of client.runtime().query(plan) as AsyncIterable<Row>) rows.push(row);
  return rows;
}

export function createApplication(runtime: Runtime): Application {
  const client: RawClient = postgres({ url: runtime.connectionString, contract });
  let closed = false;

  function ensureOpen(): void {
    if (closed) throw applicationError('APPLICATION_CLOSED', 'application is closed');
  }

  return {
    async list(input = {}): Promise<Ticket[]> {
      ensureOpen();
      if (input === null || typeof input !== 'object' || Array.isArray(input)) validation('input must be an object');
      const status = input.status;
      const sort = input.sort ?? 'id';
      const direction = input.direction ?? 'asc';
      const offset = integerInRange(input.offset, 'offset', 0, 10_000, 0);
      const limit = integerInRange(input.limit, 'limit', 1, 100, 100);
      if (status !== undefined && !statuses.has(status)) validation('status is invalid');
      if (!sorts.has(sort)) validation('sort is invalid');
      if (!directions.has(direction)) validation('direction is invalid');
      const hasAssignee = Object.hasOwn(input, 'assignee');
      const assignee = hasAssignee ? textOrNull(input.assignee, 'assignee') : null;
      const rows = await queryRows(client, ticketRows(client)`
        SELECT id::text AS id, title, status::text AS status, assignee, priority,
               to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS created_at, metadata
        FROM tickets
        WHERE (NOT ${status !== undefined}::boolean OR status = ${status ?? 'open'}::ticket_status)
          AND (
            NOT ${hasAssignee}::boolean
            OR (${assignee === null}::boolean AND assignee IS NULL)
            OR (NOT ${assignee === null}::boolean AND assignee = ${assignee ?? ''}::text)
          )
        ORDER BY
          CASE WHEN ${sort}::text = 'id' AND ${direction}::text = 'asc' THEN id END ASC,
          CASE WHEN ${sort}::text = 'id' AND ${direction}::text = 'desc' THEN id END DESC,
          CASE WHEN ${sort}::text = 'priority' AND ${direction}::text = 'asc' THEN priority::bigint END ASC,
          CASE WHEN ${sort}::text = 'priority' AND ${direction}::text = 'desc' THEN priority::bigint END DESC,
          CASE WHEN ${sort}::text = 'createdAt' AND ${direction}::text = 'asc' THEN created_at END ASC,
          CASE WHEN ${sort}::text = 'createdAt' AND ${direction}::text = 'desc' THEN created_at END DESC,
          id ASC
        OFFSET ${offset}::integer
        LIMIT ${limit}::integer
      `);
      return rows.map(ticketFromRow);
    },

    async get(input: { id: string }): Promise<Ticket | null> {
      ensureOpen();
      const id = positiveIntegerString(input?.id, 'id');
      const rows = await queryRows(client, ticketRows(client)`
        SELECT id::text AS id, title, status::text AS status, assignee, priority,
               to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS created_at, metadata
        FROM tickets
        WHERE id = ${id}::bigint
        LIMIT 1
      `);
      return rows.length === 0 ? null : ticketFromRow(rows[0]!);
    },

    async create(input): Promise<Ticket> {
      ensureOpen();
      if (input === null || typeof input !== 'object') validation('input must be an object');
      if (typeof input.title !== 'string') validation('title must be a string');
      if (!statuses.has(input.status)) validation('status is invalid');
      const assignee = textOrNull(input.assignee, 'assignee');
      const priority = integerInRange(input.priority, 'priority', 1, 5);
      const metadata = input.metadata === undefined ? {} : jsonRecord(input.metadata, 'metadata');
      const createdAt = new Date().toISOString();
      const rows = await queryRows(client, ticketRows(client)`
        INSERT INTO tickets (title, status, assignee, priority, created_at, metadata)
        VALUES (
          ${input.title}::text,
          ${input.status}::ticket_status,
          CASE WHEN ${assignee === null}::boolean THEN NULL ELSE ${assignee ?? ''}::text END,
          ${priority}::integer,
          ${createdAt}::timestamptz,
          ${JSON.stringify(metadata)}::jsonb
        )
        RETURNING id::text AS id, title, status::text AS status, assignee, priority,
                  to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS created_at, metadata
      `);
      return ticketFromRow(rows[0]!);
    },

    async assign(input): Promise<{ id: string; assignee: string | null }> {
      ensureOpen();
      const id = positiveIntegerString(input?.id, 'id');
      const assignee = textOrNull(input?.assignee, 'assignee');
      return client.transaction(async (tx: any) => {
        const updated: Row[] = [];
        for await (const row of tx.query(assignmentRows(client)`
          UPDATE tickets
          SET assignee = CASE WHEN ${assignee === null}::boolean THEN NULL ELSE ${assignee ?? ''}::text END
          WHERE id = ${id}::bigint
          RETURNING id::text AS id, assignee
        `) as AsyncIterable<Row>) updated.push(row);
        const row = updated[0];
        if (row === undefined) throw applicationError('NOT_FOUND', 'ticket was not found');
        const detail = JSON.stringify({ assignee });
        await tx.execute(raw(client)`
          INSERT INTO ticket_audit (ticket_id, action, detail, created_at)
          VALUES (${id}::bigint, 'assign'::text, ${detail}::text, ${new Date().toISOString()}::timestamptz)
        `.affectedCount().build());
        return { id: row.id as string, assignee: row.assignee as string | null };
      });
    },

    async close(): Promise<void> {
      if (closed) return;
      closed = true;
      await client.close();
    },
  };
}
