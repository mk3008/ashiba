/** Application-service seam. Implement the use cases here or in the data-access layer. */
export const ticketServiceBoundary = 'application-owned';

import type { Pool } from 'pg';
import {
  type AssignTicketInput,
  type CreateTicketInput,
  type ListTicketsInput,
  type TicketDto,
  type TicketSort,
  type SortDirection,
} from '../contracts/ticket-dto.js';
import { TicketDataAccess } from '../data-access/ticket-data-access.js';
import { PgPoolProvider } from '../platform/pool.js';
import { PgTransactionRunner } from '../platform/transaction.js';
import { isTicketStatus } from '../presentation/ticket-controller.js';

export class ApplicationError extends Error {
  constructor(readonly code: 'VALIDATION' | 'NOT_FOUND' | 'APPLICATION_CLOSED', message: string) {
    super(message);
    this.name = 'ApplicationError';
  }
}

function validation(message: string): never {
  throw new ApplicationError('VALIDATION', message);
}

function positiveId(value: unknown): string {
  if (typeof value !== 'string' || !/^[1-9][0-9]*$/.test(value)) {
    return validation('id must be a positive base-10 integer string');
  }
  return value;
}

function assignee(value: unknown): string | null {
  if (value !== null && typeof value !== 'string') {
    return validation('assignee must be a string or null');
  }
  return value;
}

function metadata(value: unknown): string {
  if (value === undefined) {
    return '{}';
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return validation('metadata must be an object');
  }
  try {
    const serialized = JSON.stringify(value);
    if (serialized === undefined) {
      return validation('metadata must be JSON-safe');
    }
    return serialized;
  } catch {
    return validation('metadata must be JSON-safe');
  }
}

function integerInRange(value: unknown, min: number, max: number, field: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    return validation(`${field} must be an integer from ${min} through ${max}`);
  }
  return value;
}

export class TicketService {
  private closed = false;
  private closePromise: Promise<void> | undefined;

  constructor(
    private readonly pools: PgPoolProvider,
    private readonly transactions: PgTransactionRunner,
    private readonly tickets = new TicketDataAccess(),
  ) {}

  async list(input?: ListTicketsInput): Promise<TicketDto[]> {
    this.assertOpen();
    if (input !== undefined && (input === null || typeof input !== 'object')) {
      return validation('list input must be an object');
    }
    const statusSupplied = input !== undefined && Object.hasOwn(input, 'status');
    if (statusSupplied && !isTicketStatus(input?.status)) {
      return validation('status is invalid');
    }
    const assigneeSupplied = input !== undefined && Object.hasOwn(input, 'assignee');
    const suppliedAssignee = assigneeSupplied ? assignee(input?.assignee) : null;
    const sort = input?.sort ?? 'id';
    if (sort !== 'id' && sort !== 'priority' && sort !== 'createdAt') {
      return validation('sort is invalid');
    }
    const direction = input?.direction ?? 'asc';
    if (direction !== 'asc' && direction !== 'desc') {
      return validation('direction is invalid');
    }
    const offset = input?.offset === undefined ? 0 : integerInRange(input.offset, 0, 10_000, 'offset');
    const limit = input?.limit === undefined ? 100 : integerInRange(input.limit, 1, 100, 'limit');
    return this.pools.withPool((pool) => this.tickets.list(pool as Pool, {
      hasStatus: statusSupplied,
      status: input?.status ?? 'open',
      hasAssignee: assigneeSupplied,
      assignee: suppliedAssignee,
      offset,
      limit,
    }, sort as TicketSort, direction as SortDirection));
  }

  async get(input: { id: string }): Promise<TicketDto | null> {
    this.assertOpen();
    const id = positiveId(input?.id);
    return this.pools.withPool((pool) => this.tickets.get(pool as Pool, id));
  }

  async create(input: CreateTicketInput): Promise<TicketDto> {
    this.assertOpen();
    if (input === null || typeof input !== 'object' || typeof input.title !== 'string' || !isTicketStatus(input.status)) {
      return validation('title and status are required');
    }
    const priority = integerInRange(input.priority, 1, 5, 'priority');
    return this.pools.withPool((pool) => this.tickets.create(pool as Pool, {
      title: input.title,
      status: input.status,
      assignee: assignee(input.assignee),
      priority,
      metadata: metadata(input.metadata),
    }));
  }

  async assign(input: AssignTicketInput): Promise<{ id: string; assignee: string | null }> {
    this.assertOpen();
    const id = positiveId(input?.id);
    const nextAssignee = assignee(input?.assignee);
    return this.transactions.inTransaction(async (client) => {
      const result = await this.tickets.assign(client, id, nextAssignee);
      if (result === null) {
        throw new ApplicationError('NOT_FOUND', 'ticket was not found');
      }
      return result;
    });
  }

  close(): Promise<void> {
    if (!this.closePromise) {
      this.closed = true;
      this.closePromise = this.pools.close();
    }
    return this.closePromise;
  }

  private assertOpen(): void {
    if (this.closed) {
      throw new ApplicationError('APPLICATION_CLOSED', 'application is closed');
    }
  }
}
