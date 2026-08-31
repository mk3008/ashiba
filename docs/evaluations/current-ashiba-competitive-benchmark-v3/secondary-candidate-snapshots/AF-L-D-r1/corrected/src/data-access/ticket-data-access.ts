import { sql, type SQL } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { applicationError } from '../contracts/application-error.js';
import type { TicketDto } from '../contracts/ticket-dto.js';

export type TicketStatus = 'open' | 'pending' | 'closed';
export type TicketSort = 'id' | 'priority' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

export interface ListTicketsInput {
  status?: TicketStatus;
  assignee?: string | null;
  sort?: TicketSort;
  direction?: SortDirection;
  offset?: number;
  limit?: number;
}

export interface CreateTicketInput {
  title: string;
  status: TicketStatus;
  assignee: string | null;
  priority: number;
  metadata?: Record<string, unknown>;
}

interface QueryExecutor {
  execute(query: SQL): Promise<{ rows: unknown[] }>;
}

interface TicketRow {
  id: string;
  title: string;
  status: TicketStatus;
  assignee: string | null;
  priority: number;
  createdAt: Date | string;
  metadata: unknown;
}

const sortColumns: Record<TicketSort, SQL> = {
  id: sql.raw('t.id'),
  priority: sql.raw('t.priority'),
  createdAt: sql.raw('t.created_at'),
};

const sortDirections: Record<SortDirection, SQL> = {
  asc: sql.raw('ASC'),
  desc: sql.raw('DESC'),
};

/**
 * Drizzle SQL is used for this small brownfield boundary because PostgreSQL
 * bigint identifiers must remain strings at the application edge. The runner
 * owns DDL and the nonce schema, so no candidate migration is appropriate.
 */
export class TicketDataAccess {
  public constructor(private readonly database: NodePgDatabase) {}

  public async list(rawInput?: ListTicketsInput): Promise<TicketDto[]> {
    const input = validateListInput(rawInput);
    const filters: SQL[] = [];

    if (input.status !== undefined) {
      filters.push(sql`t.status = ${input.status}`);
    }
    if (input.assignee === null) {
      filters.push(sql`t.assignee IS NULL`);
    } else if (input.assignee !== undefined) {
      filters.push(sql`t.assignee = ${input.assignee}`);
    }

    const whereClause = filters.length === 0
      ? sql.empty()
      : sql`WHERE ${sql.join(filters, sql` AND `)}`;
    const executor = this.database as unknown as QueryExecutor;
    const result = await executor.execute(sql`
      SELECT t.id::text AS id, t.title, t.status::text AS status, t.assignee,
             t.priority, t.created_at AS "createdAt", t.metadata
      FROM tickets AS t
      ${whereClause}
      ORDER BY ${sortColumns[input.sort]} ${sortDirections[input.direction]}, t.id ASC
      OFFSET ${input.offset} LIMIT ${input.limit}
    `);

    return result.rows.map(toTicket);
  }

  public async get(rawInput: { id: string }): Promise<TicketDto | null> {
    const id = validateIdentifier(rawInput?.id, 'id');
    const executor = this.database as unknown as QueryExecutor;
    const result = await executor.execute(sql`
      SELECT t.id::text AS id, t.title, t.status::text AS status, t.assignee,
             t.priority, t.created_at AS "createdAt", t.metadata
      FROM tickets AS t WHERE t.id = ${id}
    `);
    const row = result.rows[0];
    return row === undefined ? null : toTicket(row);
  }

  public async create(rawInput: CreateTicketInput): Promise<TicketDto> {
    const input = validateCreateInput(rawInput);
    const executor = this.database as unknown as QueryExecutor;
    const result = await executor.execute(sql`
      INSERT INTO tickets (title, status, assignee, priority, created_at, metadata)
      VALUES (${input.title}, ${input.status}, ${input.assignee}, ${input.priority}, ${new Date()}, ${JSON.stringify(input.metadata)}::jsonb)
      RETURNING id::text AS id, title, status::text AS status, assignee,
                priority, created_at AS "createdAt", metadata
    `);
    return toTicket(result.rows[0]);
  }

  public async assign(rawInput: { id: string; assignee: string | null }): Promise<{ id: string; assignee: string | null }> {
    const id = validateIdentifier(rawInput?.id, 'id');
    const assignee = validateAssignee(rawInput?.assignee);

    return this.database.transaction(async (transaction) => {
      const executor = transaction as unknown as QueryExecutor;
      const updated = await executor.execute(sql`
        UPDATE tickets SET assignee = ${assignee}
        WHERE id = ${id}
        RETURNING id::text AS id, assignee
      `);
      const row = updated.rows[0] as { id?: unknown; assignee?: unknown } | undefined;
      if (row === undefined) {
        throw applicationError('NOT_FOUND', 'Ticket was not found');
      }

      await executor.execute(sql`
        INSERT INTO ticket_audit (ticket_id, action, detail, created_at)
        VALUES (${id}, ${'assign'}, ${assignee === null ? 'unassigned' : assignee}, ${new Date()})
      `);
      return { id: expectString(row.id, 'id'), assignee: expectNullableString(row.assignee, 'assignee') };
    });
  }
}

function validateListInput(rawInput: ListTicketsInput | undefined): Required<Pick<ListTicketsInput, 'sort' | 'direction' | 'offset' | 'limit'>> & Pick<ListTicketsInput, 'status' | 'assignee'> {
  const input: ListTicketsInput = rawInput ?? {};
  if (!isObject(input)) {
    throw applicationError('VALIDATION', 'list input must be an object');
  }
  if (input.status !== undefined && !isStatus(input.status)) {
    throw applicationError('VALIDATION', 'status is invalid');
  }
  if (input.assignee !== undefined && input.assignee !== null && typeof input.assignee !== 'string') {
    throw applicationError('VALIDATION', 'assignee is invalid');
  }
  const sort = input.sort ?? 'id';
  const direction = input.direction ?? 'asc';
  const offset = input.offset ?? 0;
  const limit = input.limit ?? 100;
  if (!isTicketSort(sort) || !isSortDirection(direction)) {
    throw applicationError('VALIDATION', 'sort or direction is invalid');
  }
  if (!Number.isInteger(offset) || offset < 0 || offset > 10_000 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw applicationError('VALIDATION', 'pagination is invalid');
  }
  return { status: input.status, assignee: input.assignee, sort, direction, offset, limit };
}

function validateCreateInput(input: CreateTicketInput): Required<CreateTicketInput> {
  if (!isObject(input) || typeof input.title !== 'string' || !isStatus(input.status) || !Number.isInteger(input.priority) || input.priority < 1 || input.priority > 5) {
    throw applicationError('VALIDATION', 'create input is invalid');
  }
  const assignee = validateAssignee(input.assignee);
  const metadata = input.metadata ?? {};
  if (!isJsonObject(metadata)) {
    throw applicationError('VALIDATION', 'metadata must be JSON-safe');
  }
  return { title: input.title, status: input.status, assignee, priority: input.priority, metadata };
}

function validateIdentifier(value: unknown, field: string): string {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    throw applicationError('VALIDATION', `${field} must be a positive base-10 integer string`);
  }
  return value;
}

function validateAssignee(value: unknown): string | null {
  if (value !== null && typeof value !== 'string') {
    throw applicationError('VALIDATION', 'assignee is invalid');
  }
  return value;
}

function isStatus(value: unknown): value is TicketStatus {
  return value === 'open' || value === 'pending' || value === 'closed';
}

function isTicketSort(value: unknown): value is TicketSort {
  return value === 'id' || value === 'priority' || value === 'createdAt';
}

function isSortDirection(value: unknown): value is SortDirection {
  return value === 'asc' || value === 'desc';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return isObject(value);
}

function isObject(value: unknown): boolean {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  return isJsonValue(value);
}

function isJsonValue(value: unknown): boolean {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (!isRecord(value)) return false;
  return Object.values(value).every(isJsonValue);
}

function toTicket(value: unknown): TicketDto {
  if (!isRecord(value)) throw new Error('Database returned an invalid ticket row');
  const metadata = value.metadata;
  if (!isJsonObject(metadata)) throw new Error('Database returned invalid ticket metadata');
  const createdAt = value.createdAt;
  const timestamp = createdAt instanceof Date ? createdAt : new Date(expectString(createdAt, 'createdAt'));
  if (Number.isNaN(timestamp.valueOf())) throw new Error('Database returned an invalid ticket timestamp');
  const status = value.status;
  if (!isStatus(status)) throw new Error('Database returned an invalid ticket status');
  const priority = value.priority;
  if (typeof priority !== 'number') throw new Error('Database returned an invalid ticket priority');
  return {
    id: expectString(value.id, 'id'),
    title: expectString(value.title, 'title'),
    status,
    assignee: expectNullableString(value.assignee, 'assignee'),
    priority,
    createdAt: timestamp.toISOString(),
    metadata,
  };
}

function expectString(value: unknown, field: string): string {
  if (typeof value !== 'string') throw new Error(`Database returned an invalid ${field}`);
  return value;
}

function expectNullableString(value: unknown, field: string): string | null {
  if (value === null || typeof value === 'string') return value;
  throw new Error(`Database returned an invalid ${field}`);
}
