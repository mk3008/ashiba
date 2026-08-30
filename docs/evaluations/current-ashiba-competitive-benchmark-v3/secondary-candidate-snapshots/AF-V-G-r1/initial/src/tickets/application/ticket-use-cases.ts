import type { PoolClient } from 'pg';

import type { PoolProvider } from '../../platform/pool.js';
import type { TransactionRunner } from '../../platform/transaction.js';
import type {
  CreateTicketInput,
  ListTicketsInput,
  SortDirection,
  TicketDto,
  TicketSort,
  TicketStatus,
} from '../dto.js';
import { ticketColumns, toTicketDto } from '../query/ticket-read-model.js';

/** Feature-local use-case seam. Canonical SQL stays in this ticket feature. */
export const ticketUseCaseBoundary = 'vertical-slice';

export class ApplicationError extends Error {
  public readonly code: 'VALIDATION' | 'NOT_FOUND' | 'APPLICATION_CLOSED';

  public constructor(code: ApplicationError['code'], message: string) {
    super(message);
    this.name = 'ApplicationError';
    this.code = code;
  }
}

const sortColumns: Record<TicketSort, string> = {
  id: 'id',
  priority: 'priority',
  createdAt: 'created_at',
};
const sortDirections: Record<SortDirection, string> = { asc: 'ASC', desc: 'DESC' };
const statuses = new Set<TicketStatus>(['open', 'pending', 'closed']);
const bigintMaximum = 9_223_372_036_854_775_807n;

export class TicketUseCases {
  public constructor(
    private readonly pools: PoolProvider,
    private readonly transactions: TransactionRunner,
  ) {}

  public async list(input: ListTicketsInput | undefined): Promise<TicketDto[]> {
    const validated = validateListInput(input);
    const values: Array<string | number | null> = [];
    const predicates: string[] = [];
    if (validated.status !== undefined) {
      values.push(validated.status);
      predicates.push(`status = $${values.length}`);
    }
    if (validated.hasAssignee) {
      values.push(validated.assignee);
      predicates.push(`assignee IS NOT DISTINCT FROM $${values.length}`);
    }
    const where = predicates.length === 0 ? '' : `WHERE ${predicates.join(' AND ')}`;
    values.push(validated.limit, validated.offset);
    const orderBy = `${sortColumns[validated.sort]} ${sortDirections[validated.direction]}, id ASC`;
    const sql = `SELECT ${ticketColumns} FROM tickets ${where} ORDER BY ${orderBy} LIMIT $${values.length - 1} OFFSET $${values.length}`;
    return this.pools.withPool(async (pool) => {
      const result = await pool.query(sql, values);
      return result.rows.map(toTicketDto);
    });
  }

  public async get(id: string): Promise<TicketDto | null> {
    const ticketId = validatePositiveIdentifier(id, 'id');
    return this.pools.withPool(async (pool) => {
      const result = await pool.query(`SELECT ${ticketColumns} FROM tickets WHERE id = $1`, [ticketId]);
      const row = result.rows[0];
      return row === undefined ? null : toTicketDto(row);
    });
  }

  public async create(input: CreateTicketInput): Promise<TicketDto> {
    const validated = validateCreateInput(input);
    return this.pools.withPool(async (pool) => {
      const result = await pool.query(
        `INSERT INTO tickets (title, status, assignee, priority, created_at, metadata)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5::jsonb)
         RETURNING ${ticketColumns}`,
        [validated.title, validated.status, validated.assignee, validated.priority, validated.metadataJson],
      );
      return toTicketDto(result.rows[0]);
    });
  }

  public async assign(id: string, assignee: string | null): Promise<{ id: string; assignee: string | null }> {
    const ticketId = validatePositiveIdentifier(id, 'id');
    validateAssignee(assignee);
    return this.transactions.inTransaction(async (client) => this.assignInTransaction(client, ticketId, assignee));
  }

  private async assignInTransaction(
    client: PoolClient,
    ticketId: string,
    assignee: string | null,
  ): Promise<{ id: string; assignee: string | null }> {
    const updated = await client.query<{ id: string | number | bigint; assignee: string | null }>(
      'UPDATE tickets SET assignee = $2 WHERE id = $1 RETURNING id, assignee',
      [ticketId, assignee],
    );
    const row = updated.rows[0];
    if (row === undefined) {
      throw new ApplicationError('NOT_FOUND', 'ticket was not found');
    }
    await client.query(
      `INSERT INTO ticket_audit (ticket_id, action, detail, created_at)
       VALUES ($1, 'assign', $2, CURRENT_TIMESTAMP)`,
      [ticketId, assignee === null ? 'unassigned' : assignee],
    );
    return { id: String(row.id), assignee: row.assignee };
  }
}

function validateListInput(input: ListTicketsInput | undefined): {
  status: TicketStatus | undefined;
  hasAssignee: boolean;
  assignee: string | null;
  sort: TicketSort;
  direction: SortDirection;
  offset: number;
  limit: number;
} {
  if (input !== undefined && !isRecord(input)) throw validationError('list input must be an object');
  const source: ListTicketsInput = input ?? {};
  if (source.status !== undefined && !isTicketStatus(source.status)) throw validationError('status is invalid');
  if (source.assignee !== undefined) validateAssignee(source.assignee);
  if (source.sort !== undefined && !isTicketSort(source.sort)) throw validationError('sort is invalid');
  if (source.direction !== undefined && !isSortDirection(source.direction)) throw validationError('direction is invalid');
  const offset = source.offset ?? 0;
  const limit = source.limit ?? 100;
  if (!Number.isInteger(offset) || offset < 0 || offset > 10_000) throw validationError('offset is invalid');
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw validationError('limit is invalid');
  return {
    status: source.status,
    hasAssignee: Object.hasOwn(source, 'assignee'),
    assignee: source.assignee ?? null,
    sort: source.sort ?? 'id',
    direction: source.direction ?? 'asc',
    offset,
    limit,
  };
}

function validateCreateInput(input: CreateTicketInput): {
  title: string;
  status: TicketStatus;
  assignee: string | null;
  priority: number;
  metadataJson: string;
} {
  if (!isRecord(input) || typeof input.title !== 'string' || !isTicketStatus(input.status)) {
    throw validationError('create input is invalid');
  }
  validateAssignee(input.assignee);
  if (!Number.isInteger(input.priority) || input.priority < 1 || input.priority > 5) {
    throw validationError('priority is invalid');
  }
  return {
    title: input.title,
    status: input.status,
    assignee: input.assignee,
    priority: input.priority,
    metadataJson: stringifyMetadata(input.metadata ?? {}),
  };
}

function validatePositiveIdentifier(value: unknown, name: string): string {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw validationError(`${name} must be a positive base-10 integer string`);
  }
  const integer = BigInt(value);
  if (integer <= 0n || integer > bigintMaximum) throw validationError(`${name} is outside bigint range`);
  return value;
}

function validateAssignee(value: unknown): asserts value is string | null {
  if (typeof value !== 'string' && value !== null) throw validationError('assignee is invalid');
}

function stringifyMetadata(value: unknown): string {
  if (!isJsonRecord(value, new Set<object>())) throw validationError('metadata must be a JSON-safe object');
  return JSON.stringify(value);
}

function isJsonRecord(value: unknown, ancestors: Set<object>): value is Record<string, unknown> {
  return isRecord(value) && isJsonValue(value, ancestors);
}

function isJsonValue(value: unknown, ancestors: Set<object>): boolean {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) {
    if (ancestors.has(value)) return false;
    ancestors.add(value);
    const valid = value.every((entry) => isJsonValue(entry, ancestors));
    ancestors.delete(value);
    return valid;
  }
  if (!isRecord(value) || ancestors.has(value)) return false;
  ancestors.add(value);
  const valid = Object.values(value).every((entry) => isJsonValue(entry, ancestors));
  ancestors.delete(value);
  return valid;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isTicketStatus(value: unknown): value is TicketStatus {
  return typeof value === 'string' && statuses.has(value as TicketStatus);
}

function isTicketSort(value: unknown): value is TicketSort {
  return value === 'id' || value === 'priority' || value === 'createdAt';
}

function isSortDirection(value: unknown): value is SortDirection {
  return value === 'asc' || value === 'desc';
}

function validationError(message: string): ApplicationError {
  return new ApplicationError('VALIDATION', message);
}
