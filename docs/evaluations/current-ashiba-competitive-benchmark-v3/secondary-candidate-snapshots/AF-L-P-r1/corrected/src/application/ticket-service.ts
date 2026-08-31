import type {
  AssignTicketInput,
  CreateTicketInput,
  ListTicketsInput,
  SortDirection,
  TicketDto,
  TicketSort,
} from '../contracts/ticket-dto.js';
import { TicketApplicationError } from '../contracts/ticket-dto.js';
import { TicketDataAccess } from '../data-access/ticket-data-access.js';

const MAX_BIGINT = 9_223_372_036_854_775_807n;
const STATUSES = new Set(['open', 'pending', 'closed']);
const SORTS = new Set<TicketSort>(['id', 'priority', 'createdAt']);
const DIRECTIONS = new Set<SortDirection>(['asc', 'desc']);

function validation(message: string): never {
  throw new TicketApplicationError('VALIDATION', message);
}

function positiveId(value: unknown): bigint {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    return validation('id must be a positive base-10 integer string');
  }
  const id = BigInt(value);
  if (id > MAX_BIGINT) return validation('id is outside PostgreSQL bigint range');
  return id;
}

function status(value: unknown): asserts value is 'open' | 'pending' | 'closed' {
  if (typeof value !== 'string' || !STATUSES.has(value)) validation('status is invalid');
}

function optionalAssignee(value: unknown): asserts value is string | null | undefined {
  if (value !== undefined && value !== null && typeof value !== 'string') {
    validation('assignee must be a string or null');
  }
}

function isJsonValue(value: unknown): boolean {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value);
  return (prototype === Object.prototype || prototype === null)
    && Object.values(value as Record<string, unknown>).every(isJsonValue);
}

/** Application-service seam. It owns validation and closed-application policy. */
export const ticketServiceBoundary = 'application-owned';

export class TicketService {
  private closed = false;

  constructor(private readonly tickets: TicketDataAccess) {}

  private assertOpen(): void {
    if (this.closed) throw new TicketApplicationError('APPLICATION_CLOSED', 'Application is closed');
  }

  async list(input: ListTicketsInput = {}): Promise<TicketDto[]> {
    this.assertOpen();
    if (input === null || typeof input !== 'object') validation('list input must be an object');
    if (input.status !== undefined) status(input.status);
    optionalAssignee(input.assignee);
    const sort = input.sort ?? 'id';
    const direction = input.direction ?? 'asc';
    const offset = input.offset ?? 0;
    const limit = input.limit ?? 100;
    if (!SORTS.has(sort) || !DIRECTIONS.has(direction)) validation('sort or direction is invalid');
    if (!Number.isInteger(offset) || offset < 0 || offset > 10_000) validation('offset is invalid');
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) validation('limit is invalid');
    return this.tickets.list({ ...input, sort, direction, offset, limit });
  }

  async get(input: { id: string }): Promise<TicketDto | null> {
    this.assertOpen();
    if (input === null || typeof input !== 'object') validation('get input must be an object');
    return this.tickets.get(positiveId(input.id));
  }

  async create(input: CreateTicketInput): Promise<TicketDto> {
    this.assertOpen();
    if (input === null || typeof input !== 'object') validation('create input must be an object');
    if (typeof input.title !== 'string') validation('title must be a string');
    status(input.status);
    optionalAssignee(input.assignee);
    if (!Number.isInteger(input.priority) || input.priority < 1 || input.priority > 5) validation('priority is invalid');
    if (input.metadata !== undefined && !isJsonValue(input.metadata)) validation('metadata must be JSON-safe');
    return this.tickets.create(input);
  }

  async assign(input: AssignTicketInput): Promise<{ id: string; assignee: string | null }> {
    this.assertOpen();
    if (input === null || typeof input !== 'object') validation('assign input must be an object');
    optionalAssignee(input.assignee);
    return this.tickets.assign(input, positiveId(input.id));
  }

  close(): void {
    this.closed = true;
  }
}
