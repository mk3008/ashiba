/** Application-service seam. Implement the use cases here or in the data-access layer. */
export const ticketServiceBoundary = 'application-owned';

import type {
  AssignTicketInput,
  CreateTicketInput,
  ListTicketsInput,
  SortDirection,
  TicketDto,
  TicketSort,
  TicketStatus,
} from '../contracts/ticket-dto.js';
import { TicketDataAccess } from '../data-access/ticket-data-access.js';

export interface ApplicationError extends Error {
  code: 'VALIDATION' | 'NOT_FOUND' | 'APPLICATION_CLOSED';
}

function validationError(message: string): ApplicationError {
  const error = new Error(message) as ApplicationError;
  error.code = 'VALIDATION';
  return error;
}

function hasOwn(value: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function asObject(value: unknown, message: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw validationError(message);
  }
  return value as Record<string, unknown>;
}

function isStatus(value: unknown): value is TicketStatus {
  return value === 'open' || value === 'pending' || value === 'closed';
}

function isSort(value: unknown): value is TicketSort {
  return value === 'id' || value === 'priority' || value === 'createdAt';
}

function isDirection(value: unknown): value is SortDirection {
  return value === 'asc' || value === 'desc';
}

function isInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value);
}

function positiveId(value: unknown): string {
  if (typeof value !== 'string' || !/^0*[1-9][0-9]*$/.test(value)) {
    throw validationError('id must be a positive base-10 integer string');
  }
  try {
    if (BigInt(value) > 9_223_372_036_854_775_807n) {
      throw validationError('id is outside the supported range');
    }
  } catch (error) {
    if ((error as Partial<ApplicationError>).code === 'VALIDATION') {
      throw error;
    }
    throw validationError('id must be a positive base-10 integer string');
  }
  return value;
}

function assignee(value: unknown): string | null {
  if (value !== null && typeof value !== 'string') {
    throw validationError('assignee must be a string or null');
  }
  return value;
}

function jsonObject(value: unknown): Record<string, unknown> {
  const metadata = asObject(value, 'metadata must be an object');
  try {
    JSON.stringify(metadata);
  } catch {
    throw validationError('metadata must be JSON-safe');
  }
  return metadata;
}

function normaliseList(input: unknown): Required<Pick<ListTicketsInput, 'sort' | 'direction' | 'offset' | 'limit'>> & ListTicketsInput {
  const value = input === undefined ? {} : asObject(input, 'list input must be an object');
  const result: Required<Pick<ListTicketsInput, 'sort' | 'direction' | 'offset' | 'limit'>> & ListTicketsInput = {
    sort: 'id', direction: 'asc', offset: 0, limit: 100,
  };

  if (hasOwn(value, 'status')) {
    if (!isStatus(value.status)) throw validationError('unsupported status');
    result.status = value.status;
  }
  if (hasOwn(value, 'assignee')) result.assignee = assignee(value.assignee);
  if (hasOwn(value, 'sort')) {
    if (!isSort(value.sort)) throw validationError('unsupported sort');
    result.sort = value.sort;
  }
  if (hasOwn(value, 'direction')) {
    if (!isDirection(value.direction)) throw validationError('unsupported sort direction');
    result.direction = value.direction;
  }
  if (hasOwn(value, 'offset')) {
    if (!isInteger(value.offset) || value.offset < 0 || value.offset > 10_000) throw validationError('offset is out of range');
    result.offset = value.offset;
  }
  if (hasOwn(value, 'limit')) {
    if (!isInteger(value.limit) || value.limit < 1 || value.limit > 100) throw validationError('limit is out of range');
    result.limit = value.limit;
  }
  return result;
}

function normaliseCreate(input: unknown): CreateTicketInput {
  const value = asObject(input, 'create input must be an object');
  if (typeof value.title !== 'string') throw validationError('title must be a string');
  if (!isStatus(value.status)) throw validationError('unsupported status');
  if (!isInteger(value.priority) || value.priority < 1 || value.priority > 5) throw validationError('priority is out of range');
  const result: CreateTicketInput = {
    title: value.title,
    status: value.status,
    assignee: assignee(value.assignee),
    priority: value.priority,
  };
  if (hasOwn(value, 'metadata')) result.metadata = jsonObject(value.metadata);
  return result;
}

function normaliseAssign(input: unknown): AssignTicketInput {
  const value = asObject(input, 'assign input must be an object');
  return { id: positiveId(value.id), assignee: assignee(value.assignee) };
}

export class TicketService {
  constructor(private readonly tickets: TicketDataAccess) {}

  list(input?: ListTicketsInput): Promise<TicketDto[]> {
    return this.tickets.list(normaliseList(input));
  }

  get(input: { id: string }): Promise<TicketDto | null> {
    return this.tickets.get(positiveId(asObject(input, 'get input must be an object').id));
  }

  create(input: CreateTicketInput): Promise<TicketDto> {
    return this.tickets.create(normaliseCreate(input));
  }

  async assign(input: AssignTicketInput): Promise<{ id: string; assignee: string | null }> {
    const ticket = await this.tickets.assign(normaliseAssign(input));
    if (ticket === null) {
      const error = new Error('ticket not found') as ApplicationError;
      error.code = 'NOT_FOUND';
      throw error;
    }
    return ticket;
  }
}
