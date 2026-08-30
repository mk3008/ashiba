/** Application-service seam. It owns validation and use-case error semantics. */
import type { TicketDto } from '../contracts/ticket-dto.js';
import {
  TicketDataAccess,
  TicketNotFoundError,
  type AssignTicketInput,
  type CreateTicketInput,
  type SortDirection,
  type TicketListOptions,
  type TicketSort,
  type TicketStatus,
} from '../data-access/ticket-data-access.js';

export const ticketServiceBoundary = 'application-owned';

export class ApplicationError extends Error {
  constructor(readonly code: 'VALIDATION' | 'NOT_FOUND' | 'APPLICATION_CLOSED', message: string) {
    super(message);
    this.name = 'ApplicationError';
  }
}

export type ListInput = {
  status?: TicketStatus;
  assignee?: string | null;
  sort?: TicketSort;
  direction?: SortDirection;
  offset?: number;
  limit?: number;
};

function validation(message: string): never {
  throw new ApplicationError('VALIDATION', message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function positiveIntegerString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !/^[0-9]+$/.test(value) || BigInt(value) <= 0n) {
    return validation(`${field} must be a positive base-10 integer string`);
  }
  return value;
}

function status(value: unknown): TicketStatus {
  if (value === 'open' || value === 'pending' || value === 'closed') return value;
  return validation('status must be open, pending, or closed');
}

function assignee(value: unknown): string | null {
  if (value === null || typeof value === 'string') return value;
  return validation('assignee must be a string or null');
}

function priority(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 5) {
    return validation('priority must be an integer from 1 through 5');
  }
  return value;
}

function pagination(value: unknown, field: 'offset' | 'limit', minimum: number, maximum: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < minimum || value > maximum) {
    return validation(`${field} must be an integer from ${minimum} through ${maximum}`);
  }
  return value;
}

function jsonObject(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) return validation('metadata must be a JSON object');
  try {
    JSON.stringify(value);
  } catch {
    return validation('metadata must be JSON-safe');
  }
  return value;
}

export class TicketService {
  constructor(private readonly dataAccess: TicketDataAccess) {}

  async list(input: ListInput | undefined): Promise<TicketDto[]> {
    if (input !== undefined && !isRecord(input)) validation('list input must be an object');
    const source = input ?? {};
    const suppliedAssignee = Object.hasOwn(source, 'assignee');
    const options: TicketListOptions = {
      status: source.status === undefined ? undefined : status(source.status),
      hasAssignee: suppliedAssignee,
      assignee: suppliedAssignee ? assignee(source.assignee) : undefined,
      sort: source.sort === undefined ? 'id' : validSort(source.sort),
      direction: source.direction === undefined ? 'asc' : validDirection(source.direction),
      offset: source.offset === undefined ? 0 : pagination(source.offset, 'offset', 0, 10_000),
      limit: source.limit === undefined ? 100 : pagination(source.limit, 'limit', 1, 100),
    };
    return this.dataAccess.list(options);
  }

  async get(input: unknown): Promise<TicketDto | null> {
    if (!isRecord(input)) validation('get input must be an object');
    return this.dataAccess.get(positiveIntegerString(input.id, 'id'));
  }

  async create(input: unknown): Promise<TicketDto> {
    if (!isRecord(input) || typeof input.title !== 'string') validation('create input must include a string title');
    const createInput: CreateTicketInput = {
      title: input.title,
      status: status(input.status),
      assignee: assignee(input.assignee),
      priority: priority(input.priority),
      metadata: input.metadata === undefined ? {} : jsonObject(input.metadata),
    };
    return this.dataAccess.create(createInput);
  }

  async assign(input: unknown): Promise<{ id: string; assignee: string | null }> {
    if (!isRecord(input)) validation('assign input must be an object');
    const assignInput: AssignTicketInput = {
      id: positiveIntegerString(input.id, 'id'),
      assignee: assignee(input.assignee),
    };
    try {
      return await this.dataAccess.assign(assignInput);
    } catch (error) {
      if (error instanceof TicketNotFoundError) {
        throw new ApplicationError('NOT_FOUND', 'Ticket was not found');
      }
      throw error;
    }
  }
}

function validSort(value: unknown): TicketSort {
  if (value === 'id' || value === 'priority' || value === 'createdAt') return value;
  return validation('sort is not supported');
}

function validDirection(value: unknown): SortDirection {
  if (value === 'asc' || value === 'desc') return value;
  return validation('direction is not supported');
}
