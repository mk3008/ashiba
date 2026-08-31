import { bindNamedParameters, type ParameterBinding } from '@ashiba-ts/named-parameters';
import { compileNamedParameters } from '@ashiba-ts/named-parameters/compiler';
import type { Pool, PoolClient } from 'pg';

import type { TicketDto } from '../dto.js';
import {
  assignTicketSql,
  createTicketSql,
  getTicketSql,
  insertAssignmentAuditSql,
  listTicketsSql,
  type SortDirection,
  type TicketSort,
} from '../query/ticket-read-model.js';

/** Feature-local use-case seam. */
export const ticketUseCaseBoundary = 'vertical-slice';

export type TicketStatus = TicketDto['status'];

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

export interface AssignTicketInput {
  id: string;
  assignee: string | null;
}

type QuerySession = Pick<Pool, 'query'> | Pick<PoolClient, 'query'>;
type QueryRow = Record<string, unknown>;
type PreparedQuery = ParameterBinding;

const preparedListTickets = {
  id: {
    asc: compileNamedParameters(listTicketsSql.id.asc),
    desc: compileNamedParameters(listTicketsSql.id.desc),
  },
  priority: {
    asc: compileNamedParameters(listTicketsSql.priority.asc),
    desc: compileNamedParameters(listTicketsSql.priority.desc),
  },
  createdAt: {
    asc: compileNamedParameters(listTicketsSql.createdAt.asc),
    desc: compileNamedParameters(listTicketsSql.createdAt.desc),
  },
} satisfies Record<TicketSort, Record<SortDirection, PreparedQuery>>;

const preparedGetTicket = compileNamedParameters(getTicketSql);
const preparedCreateTicket = compileNamedParameters(createTicketSql);
const preparedAssignTicket = compileNamedParameters(assignTicketSql);
const preparedInsertAssignmentAudit = compileNamedParameters(insertAssignmentAuditSql);
const maximumBigint = 9_223_372_036_854_775_807n;

export function validationError(message: string): Error & { code: 'VALIDATION' } {
  return Object.assign(new Error(message), { code: 'VALIDATION' as const });
}

export function notFoundError(message: string): Error & { code: 'NOT_FOUND' } {
  return Object.assign(new Error(message), { code: 'NOT_FOUND' as const });
}

export function createTicketUseCases(pool: Pool) {
  return {
    async list(input: ListTicketsInput = {}): Promise<TicketDto[]> {
      const normalized = normalizeListInput(input);
      const result = await query<QueryRow>(
        pool,
        preparedListTickets[normalized.sort][normalized.direction],
        {
          status: normalized.status,
          assignee: normalized.assignee,
          hasAssigneeFilter: normalized.hasAssigneeFilter,
          offset: normalized.offset,
          limit: normalized.limit,
        },
      );
      return result.rows.map(toTicketDto);
    },

    async get(input: { id: string }): Promise<TicketDto | null> {
      const id = validId(readStringProperty(input, 'id'));
      const result = await query<QueryRow>(pool, preparedGetTicket, { id });
      return result.rows.length === 0 ? null : toTicketDto(result.rows[0]);
    },

    async create(input: CreateTicketInput): Promise<TicketDto> {
      const normalized = normalizeCreateInput(input);
      const result = await query<QueryRow>(pool, preparedCreateTicket, normalized);
      return toTicketDto(requiredRow(result.rows, 'create did not return a ticket'));
    },

    async assign(input: AssignTicketInput): Promise<{ id: string; assignee: string | null }> {
      const id = validId(readStringProperty(input, 'id'));
      const assignee = readNullableStringProperty(input, 'assignee');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const updated = await query<QueryRow>(client, preparedAssignTicket, { id, assignee });
        if (updated.rows.length === 0) {
          throw notFoundError(`ticket ${id} was not found`);
        }
        await query(client, preparedInsertAssignmentAudit, {
          id,
          detail: JSON.stringify({ assignee }),
        });
        await client.query('COMMIT');
        const row = requiredRow(updated.rows, 'assignment did not return a ticket');
        return { id: readRowString(row, 'id'), assignee: readRowNullableString(row, 'assignee') };
      } catch (error) {
        try {
          await client.query('ROLLBACK');
        } catch {
          // The original database error is the useful failure for callers.
        }
        throw error;
      } finally {
        client.release();
      }
    },
  };
}

async function query<Row extends QueryRow = QueryRow>(
  session: QuerySession,
  statement: PreparedQuery,
  params: Readonly<Record<string, unknown>>,
): Promise<{ rows: Row[] }> {
  const bound = bindNamedParameters(statement, params);
  const result = await session.query<Row>(bound.sql, [...bound.values]);
  return { rows: result.rows };
}

function normalizeListInput(input: ListTicketsInput): {
  status: TicketStatus | null;
  assignee: string | null;
  hasAssigneeFilter: boolean;
  sort: TicketSort;
  direction: SortDirection;
  offset: number;
  limit: number;
} {
  if (!isRecord(input)) {
    throw validationError('list input must be an object');
  }
  const status = input.status === undefined ? null : validStatus(input.status);
  const hasAssigneeFilter = Object.hasOwn(input, 'assignee');
  const assignee = hasAssigneeFilter ? nullableString(input.assignee, 'assignee') : null;
  const sort = input.sort === undefined ? 'id' : validSort(input.sort);
  const direction = input.direction === undefined ? 'asc' : validDirection(input.direction);
  const offset = input.offset === undefined ? 0 : boundedInteger(input.offset, 'offset', 0, 10_000);
  const limit = input.limit === undefined ? 50 : boundedInteger(input.limit, 'limit', 1, 100);
  return { status, assignee, hasAssigneeFilter, sort, direction, offset, limit };
}

function normalizeCreateInput(input: CreateTicketInput): {
  title: string;
  status: TicketStatus;
  assignee: string | null;
  priority: number;
  metadata: Record<string, unknown>;
} {
  if (!isRecord(input)) {
    throw validationError('create input must be an object');
  }
  const title = readStringProperty(input, 'title');
  const status = validStatus(input.status);
  const assignee = nullableString(input.assignee, 'assignee');
  const priority = boundedInteger(input.priority, 'priority', 1, 5);
  const metadata = input.metadata === undefined ? {} : jsonObject(input.metadata, 'metadata');
  return { title, status, assignee, priority, metadata };
}

function validId(value: string): string {
  if (!/^[1-9]\d*$/.test(value) || BigInt(value) > maximumBigint) {
    throw validationError('id must be a positive base-10 bigint string');
  }
  return value;
}

function validStatus(value: unknown): TicketStatus {
  if (value === 'open' || value === 'pending' || value === 'closed') {
    return value;
  }
  throw validationError('status is invalid');
}

function validSort(value: unknown): TicketSort {
  if (value === 'id' || value === 'priority' || value === 'createdAt') {
    return value;
  }
  throw validationError('sort is invalid');
}

function validDirection(value: unknown): SortDirection {
  if (value === 'asc' || value === 'desc') {
    return value;
  }
  throw validationError('direction is invalid');
}

function boundedInteger(value: unknown, name: string, minimum: number, maximum: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < minimum || value > maximum) {
    throw validationError(`${name} is out of range`);
  }
  return value;
}

function nullableString(value: unknown, name: string): string | null {
  if (value === null || typeof value === 'string') {
    return value;
  }
  throw validationError(`${name} must be a string or null`);
}

function readStringProperty(value: unknown, name: string): string {
  if (!isRecord(value) || typeof value[name] !== 'string') {
    throw validationError(`${name} must be a string`);
  }
  return value[name];
}

function readNullableStringProperty(value: unknown, name: string): string | null {
  if (!isRecord(value)) {
    throw validationError(`${name} must be a string or null`);
  }
  return nullableString(value[name], name);
}

function jsonObject(value: unknown, name: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw validationError(`${name} must be a JSON object`);
  }
  try {
    JSON.stringify(value);
  } catch {
    throw validationError(`${name} must be JSON-safe`);
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredRow(rows: QueryRow[], message: string): QueryRow {
  const row = rows[0];
  if (row === undefined) {
    throw new Error(message);
  }
  return row;
}

function toTicketDto(row: QueryRow): TicketDto {
  const createdAt = row.createdAt;
  if (!(createdAt instanceof Date) || Number.isNaN(createdAt.valueOf())) {
    throw new Error('ticket timestamp was not returned as a valid Date');
  }
  return {
    id: readRowString(row, 'id'),
    title: readRowString(row, 'title'),
    status: validStatus(row.status),
    assignee: readRowNullableString(row, 'assignee'),
    priority: boundedInteger(row.priority, 'priority', 1, 5),
    createdAt: createdAt.toISOString(),
    metadata: jsonObject(row.metadata, 'metadata'),
  };
}

function readRowString(row: QueryRow, name: string): string {
  const value = row[name];
  if (typeof value !== 'string') {
    throw new Error(`database row did not contain string ${name}`);
  }
  return value;
}

function readRowNullableString(row: QueryRow, name: string): string | null {
  const value = row[name];
  if (value === null || typeof value === 'string') {
    return value;
  }
  throw new Error(`database row did not contain nullable string ${name}`);
}
