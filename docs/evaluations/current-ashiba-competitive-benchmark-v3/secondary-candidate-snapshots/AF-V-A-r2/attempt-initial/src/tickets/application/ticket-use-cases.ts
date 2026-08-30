import { bindNamedParameters } from '@ashiba-ts/named-parameters';
import type { PoolClient } from 'pg';
import type { TransactionRunner } from '../../platform/transaction.js';
import type { TicketDto } from '../dto.js';
import { toTicketDto } from '../query/ticket-read-model.js';
import { ticketSql } from '../sql/tickets.js';

/** Feature-local use-case seam. */
export const ticketUseCaseBoundary = 'vertical-slice';

export type TicketStatus = TicketDto['status'];
export type TicketSort = 'id' | 'priority' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

export type ListInput = {
  status?: TicketStatus;
  assignee?: string | null;
  sort?: TicketSort;
  direction?: SortDirection;
  offset?: number;
  limit?: number;
};

export type CreateInput = {
  title: string;
  status: TicketStatus;
  assignee: string | null;
  priority: number;
  metadata?: Record<string, unknown>;
};

export class ApplicationError extends Error {
  constructor(readonly code: 'VALIDATION' | 'NOT_FOUND' | 'APPLICATION_CLOSED') {
    super(code);
    this.name = 'ApplicationError';
  }
}

const statuses = new Set<TicketStatus>(['open', 'pending', 'closed']);
const sorts = new Set<TicketSort>(['id', 'priority', 'createdAt']);
const directions = new Set<SortDirection>(['asc', 'desc']);

function validation(condition: unknown): asserts condition {
  if (!condition) throw new ApplicationError('VALIDATION');
}

function isPositiveId(value: unknown): value is string {
  return typeof value === 'string' && /^[1-9][0-9]*$/.test(value);
}

function isJsonRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOwn(input: object, name: string): boolean {
  return Object.prototype.hasOwnProperty.call(input, name);
}

function listKey(sort: TicketSort, direction: SortDirection): keyof typeof ticketSql.list {
  const prefix = sort === 'createdAt' ? 'createdAt' : sort;
  return `${prefix}${direction === 'asc' ? 'Asc' : 'Desc'}` as keyof typeof ticketSql.list;
}

export class TicketUseCases {
  constructor(private readonly transactions: TransactionRunner) {}

  async list(client: PoolClient, input: ListInput = {}): Promise<TicketDto[]> {
    validation(typeof input === 'object' && input !== null && !Array.isArray(input));
    const statusProvided = hasOwn(input, 'status');
    const assigneeProvided = hasOwn(input, 'assignee');
    const status = input.status;
    const assignee = input.assignee;
    const sort = input.sort ?? 'id';
    const direction = input.direction ?? 'asc';
    const offset = input.offset ?? 0;
    const limit = input.limit ?? 100;

    if (statusProvided) validation(statuses.has(status as TicketStatus));
    if (assigneeProvided) validation(typeof assignee === 'string' || assignee === null);
    validation(sorts.has(sort));
    validation(directions.has(direction));
    validation(Number.isInteger(offset) && offset >= 0 && offset <= 10_000);
    validation(Number.isInteger(limit) && limit >= 1 && limit <= 100);

    const bound = bindNamedParameters(ticketSql.list[listKey(sort, direction)], {
      statusProvided,
      status: status ?? null,
      assigneeProvided,
      assignee: assignee ?? null,
      offset,
      limit,
    });
    const result = await client.query(bound.sql, [...bound.values]);
    return result.rows.map((row) => toTicketDto(row as Parameters<typeof toTicketDto>[0]));
  }

  async get(client: PoolClient, input: { id: string }): Promise<TicketDto | null> {
    validation(typeof input === 'object' && input !== null && isPositiveId(input.id));
    const bound = bindNamedParameters(ticketSql.get, { id: input.id });
    const result = await client.query(bound.sql, [...bound.values]);
    const row = result.rows[0];
    return row === undefined ? null : toTicketDto(row as Parameters<typeof toTicketDto>[0]);
  }

  async create(client: PoolClient, input: CreateInput): Promise<TicketDto> {
    validation(typeof input === 'object' && input !== null);
    validation(typeof input.title === 'string');
    validation(statuses.has(input.status));
    validation(typeof input.assignee === 'string' || input.assignee === null);
    validation(Number.isInteger(input.priority) && input.priority >= 1 && input.priority <= 5);
    validation(input.metadata === undefined || isJsonRecord(input.metadata));
    const metadata = input.metadata ?? {};
    try {
      JSON.stringify(metadata);
    } catch {
      throw new ApplicationError('VALIDATION');
    }

    const bound = bindNamedParameters(ticketSql.create, {
      title: input.title,
      status: input.status,
      assignee: input.assignee,
      priority: input.priority,
      metadata: JSON.stringify(metadata),
    });
    const result = await client.query(bound.sql, [...bound.values]);
    return toTicketDto(result.rows[0] as Parameters<typeof toTicketDto>[0]);
  }

  async assign(client: PoolClient, input: { id: string; assignee: string | null }): Promise<{ id: string; assignee: string | null }> {
    validation(typeof input === 'object' && input !== null && isPositiveId(input.id));
    validation(typeof input.assignee === 'string' || input.assignee === null);
    return this.transactions.inTransaction(async (transaction) => {
      const update = bindNamedParameters(ticketSql.assign, input);
      const result = await transaction.query(update.sql, [...update.values]);
      const row = result.rows[0] as { id: string; assignee: string | null } | undefined;
      if (row === undefined) throw new ApplicationError('NOT_FOUND');

      const audit = bindNamedParameters(ticketSql.insertAudit, {
        ticketId: input.id,
        detail: JSON.stringify({ assignee: input.assignee }),
      });
      await transaction.query(audit.sql, [...audit.values]);
      return { id: String(row.id), assignee: row.assignee };
    });
  }
}
