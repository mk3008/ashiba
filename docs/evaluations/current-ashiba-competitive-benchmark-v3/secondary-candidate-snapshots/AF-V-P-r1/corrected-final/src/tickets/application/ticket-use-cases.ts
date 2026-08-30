/** Feature-local use-case seam. Implement ticket operations here or beside it. */
export const ticketUseCaseBoundary = 'vertical-slice';

import type { PostgresClient } from '@prisma/orm-postgres/runtime';
import type { Contract } from '../../prisma/contract.d.js';
import { TicketApplicationError, type TicketDto } from '../dto.js';
import { ticketRowSpec, toTicketDto, type RawTicketRow } from '../query/ticket-read-model.js';

type Database = PostgresClient<Contract>;
type SqlClient = Pick<Database, 'raw' | 'runtime'>;
type ListInput = { status?: 'open' | 'pending' | 'closed'; assignee?: string | null; sort?: 'id' | 'priority' | 'createdAt'; direction?: 'asc' | 'desc'; offset?: number; limit?: number };
const STATUS_VALUES = new Set(['open', 'pending', 'closed']);
const SORT_VALUES = new Set(['id', 'priority', 'createdAt']);
const DIRECTION_VALUES = new Set(['asc', 'desc']);
const ORDER_BY = {
  'id:asc': 'id ASC, id ASC', 'id:desc': 'id DESC, id ASC',
  'priority:asc': 'priority ASC, id ASC', 'priority:desc': 'priority DESC, id ASC',
  'createdAt:asc': 'created_at ASC, id ASC', 'createdAt:desc': 'created_at DESC, id ASC',
} as const;
const TICKET_COLUMNS = 'id, title, status::text AS status, assignee, priority, created_at, metadata';

export function createTicketUseCases(database: Database) {
  let closed = false;
  const ensureOpen = () => { if (closed) throw new TicketApplicationError('APPLICATION_CLOSED', 'Application is closed'); };

  return {
    async list(input: ListInput = {}): Promise<TicketDto[]> {
      ensureOpen(); validateListInput(input);
      const values: unknown[] = [];
      const clauses: string[] = [];
      if (input.status !== undefined) { clauses.push(`status = $${values.length + 1}::ticket_status`); values.push(input.status); }
      if (input.assignee !== undefined) {
        if (input.assignee === null) clauses.push('assignee IS NULL');
        else { clauses.push(`assignee = $${values.length + 1}`); values.push(input.assignee); }
      }
      values.push(input.offset ?? 0, input.limit ?? 100);
      const where = clauses.length === 0 ? '' : ` WHERE ${clauses.join(' AND ')}`;
      const orderBy = ORDER_BY[`${input.sort ?? 'id'}:${input.direction ?? 'asc'}` as keyof typeof ORDER_BY];
      const statement = `SELECT ${TICKET_COLUMNS} FROM tickets${where} ORDER BY ${orderBy} OFFSET $${values.length - 1} LIMIT $${values.length}`;
      return (await rows(database, statement, values)).map(toTicketDto);
    },

    async get(input: { id: string }): Promise<TicketDto | null> {
      ensureOpen(); const id = validatePositiveId(input?.id, 'id');
      const result = await rows(database, `SELECT ${TICKET_COLUMNS} FROM tickets WHERE id = $1 LIMIT 1`, [id]);
      return result.length === 0 ? null : toTicketDto(result[0]!);
    },

    async create(input: { title: string; status: 'open' | 'pending' | 'closed'; assignee: string | null; priority: number; metadata?: Record<string, unknown> }): Promise<TicketDto> {
      ensureOpen(); validateCreateInput(input);
      const result = await rows(database,
        `INSERT INTO tickets (title, status, assignee, priority, created_at, metadata) VALUES ($1, $2::ticket_status, $3, $4, CURRENT_TIMESTAMP, $5::jsonb) RETURNING ${TICKET_COLUMNS}`,
        [input.title, input.status, input.assignee, input.priority, JSON.stringify(input.metadata ?? {})]);
      return toTicketDto(result[0]!);
    },

    async assign(input: { id: string; assignee: string | null }): Promise<{ id: string; assignee: string | null }> {
      ensureOpen(); const id = validatePositiveId(input?.id, 'id');
      if (input.assignee !== null && typeof input.assignee !== 'string') invalid('assignee must be a string or null');
      // Prisma 8's documented transaction context exposes typed ORM / builder
      // lanes but not the raw lane. A data-modifying CTE keeps this
      // PostgreSQL-specific update and audit insert in one atomic statement;
      // a trigger failure therefore rolls both writes back.
      const result = await rows(database,
        "WITH updated AS (UPDATE tickets SET assignee = $2 WHERE id = $1 RETURNING id, assignee), audited AS (INSERT INTO ticket_audit (ticket_id, action, detail, created_at) SELECT id, 'assign', $3, CURRENT_TIMESTAMP FROM updated) SELECT id, assignee FROM updated",
        [id, input.assignee, JSON.stringify({ assignee: input.assignee })],
        { id: 'pg/int8@1', assignee: { codecId: 'pg/text@1', nullable: true } });
      if (result.length === 0) throw new TicketApplicationError('NOT_FOUND', `Ticket ${id} was not found`);
      return { id: String(result[0]!.id), assignee: result[0]!.assignee };
    },

    async close(): Promise<void> { if (!closed) { closed = true; await database.close(); } },
  };
}

async function rows(database: SqlClient, sql: string, values: readonly unknown[], spec: object = ticketRowSpec): Promise<RawTicketRow[]> {
  const plan = database.raw.sql(templateFor(sql, values.length), ...(values as [])).returnsRow(spec as never).build();
  return await database.runtime().query(plan) as RawTicketRow[];
}

async function affected(database: SqlClient, sql: string, values: readonly unknown[]): Promise<void> {
  const plan = database.raw.sql(templateFor(sql, values.length), ...(values as [])).affectedCount().build();
  await database.runtime().execute(plan);
}

function templateFor(sql: string, parameterCount: number): TemplateStringsArray {
  const fragments = sql.split(/\$\d+/u);
  if (fragments.length !== parameterCount + 1) throw new Error('Internal SQL parameter mismatch');
  return Object.assign(fragments, { raw: [...fragments] }) as unknown as TemplateStringsArray;
}

function validateListInput(input: ListInput): void {
  if (input.status !== undefined && !STATUS_VALUES.has(input.status)) invalid('Invalid status');
  if (input.assignee !== undefined && input.assignee !== null && typeof input.assignee !== 'string') invalid('Invalid assignee');
  if (input.sort !== undefined && !SORT_VALUES.has(input.sort)) invalid('Invalid sort');
  if (input.direction !== undefined && !DIRECTION_VALUES.has(input.direction)) invalid('Invalid direction');
  if (input.offset !== undefined && (!Number.isInteger(input.offset) || input.offset < 0 || input.offset > 10_000)) invalid('Invalid offset');
  if (input.limit !== undefined && (!Number.isInteger(input.limit) || input.limit < 1 || input.limit > 100)) invalid('Invalid limit');
}

function validateCreateInput(input: unknown): asserts input is { title: string; status: 'open' | 'pending' | 'closed'; assignee: string | null; priority: number; metadata?: Record<string, unknown> } {
  if (typeof input !== 'object' || input === null) invalid('Input is required');
  const value = input as Record<string, unknown>;
  if (typeof value.title !== 'string') invalid('title must be a string');
  if (typeof value.status !== 'string' || !STATUS_VALUES.has(value.status)) invalid('Invalid status');
  if (value.assignee !== null && typeof value.assignee !== 'string') invalid('assignee must be a string or null');
  if (!Number.isInteger(value.priority) || (value.priority as number) < 1 || (value.priority as number) > 5) invalid('Invalid priority');
  if (value.metadata !== undefined && !isJsonRecord(value.metadata)) invalid('metadata must be an object');
}

function validatePositiveId(value: unknown, label: string): string {
  if (typeof value !== 'string' || !/^[1-9]\d*$/u.test(value)) invalid(`${label} must be a positive base-10 integer string`);
  return value;
}
function isJsonRecord(value: unknown): value is Record<string, unknown> { if (typeof value !== 'object' || value === null || Array.isArray(value)) return false; try { JSON.stringify(value); return true; } catch { return false; } }
function invalid(message: string): never { throw new TicketApplicationError('VALIDATION', message); }
