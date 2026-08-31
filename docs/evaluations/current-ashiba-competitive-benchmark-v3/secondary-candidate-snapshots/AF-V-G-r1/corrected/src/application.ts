import { NativePgPoolProvider } from './platform/pool.js';
import { NativePgTransactionRunner } from './platform/transaction.js';
import { createTicket, assignTicket } from './tickets/application/ticket-use-cases.js';
import { getTicket, listTickets, type ListTicketsInput, type SortDirection, type TicketSort } from './tickets/query/ticket-read-model.js';
import type { TicketDto, TicketStatus } from './tickets/dto.js';

export interface Runtime {
  connectionString: string;
  schema: string;
}

export interface ApplicationError extends Error {
  code: 'VALIDATION' | 'NOT_FOUND' | 'INSUFFICIENT_FUNDS' | 'APPLICATION_CLOSED';
}

export interface Application {
  list(input?: ListTicketsInput): Promise<TicketDto[]>;
  get(input: { id: string }): Promise<TicketDto | null>;
  create(input: {
    title: string;
    status: TicketStatus;
    assignee: string | null;
    priority: number;
    metadata?: Record<string, unknown>;
  }): Promise<TicketDto>;
  assign(input: { id: string; assignee: string | null }): Promise<{ id: string; assignee: string | null }>;
  close(): Promise<void>;
}

class CandidateApplicationError extends Error implements ApplicationError {
  public constructor(public readonly code: ApplicationError['code'], message: string) {
    super(message);
    this.name = 'ApplicationError';
  }
}

const statuses = new Set<TicketStatus>(['open', 'pending', 'closed']);
const sorts = new Set<TicketSort>(['id', 'priority', 'createdAt']);
const directions = new Set<SortDirection>(['asc', 'desc']);

function validation(message: string): never {
  throw new CandidateApplicationError('VALIDATION', message);
}

function assertOpen(closed: boolean): void {
  if (closed) {
    throw new CandidateApplicationError('APPLICATION_CLOSED', 'Application is closed');
  }
}

function positiveIntegerString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !/^[1-9][0-9]*$/.test(value)) {
    validation(`${field} must be a positive base-10 integer string`);
  }
  return value;
}

function validAssignee(value: unknown): value is string | null {
  if (value !== null && typeof value !== 'string') {
    validation('assignee must be a string or null');
  }
  return true;
}

function isJsonSafe(value: unknown, seen = new Set<unknown>()): boolean {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return true;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value);
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) return false;
    seen.add(value);
    const valid = value.every((item) => isJsonSafe(item, seen));
    seen.delete(value);
    return valid;
  }
  if (typeof value === 'object') {
    if (Object.getPrototypeOf(value) !== Object.prototype || seen.has(value)) return false;
    seen.add(value);
    const valid = Object.values(value).every((item) => isJsonSafe(item, seen));
    seen.delete(value);
    return valid;
  }
  return false;
}

function validateList(input: ListTicketsInput | undefined): ListTicketsInput {
  if (input === undefined) return {};
  if (input === null || typeof input !== 'object' || Array.isArray(input)) validation('list input must be an object');
  if (input.status !== undefined && !statuses.has(input.status)) validation('Unsupported status');
  if (input.assignee !== undefined) validAssignee(input.assignee);
  if (input.sort !== undefined && !sorts.has(input.sort)) validation('Unsupported sort');
  if (input.direction !== undefined && !directions.has(input.direction)) validation('Unsupported sort direction');
  if (input.offset !== undefined && (!Number.isInteger(input.offset) || input.offset < 0 || input.offset > 10_000)) validation('offset must be an integer from 0 through 10000');
  if (input.limit !== undefined && (!Number.isInteger(input.limit) || input.limit < 1 || input.limit > 100)) validation('limit must be an integer from 1 through 100');
  return input;
}

function validateCreate(input: Application['create'] extends (input: infer T) => unknown ? T : never): void {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) validation('create input must be an object');
  if (typeof input.title !== 'string') validation('title must be a string');
  if (!statuses.has(input.status)) validation('Unsupported status');
  validAssignee(input.assignee);
  if (!Number.isInteger(input.priority) || input.priority < 1 || input.priority > 5) validation('priority must be an integer from 1 through 5');
  if (input.metadata !== undefined && (input.metadata === null || !isJsonSafe(input.metadata) || Array.isArray(input.metadata))) validation('metadata must be a JSON-safe object');
}

export function createApplication(runtime: Runtime): Application {
  const pools = new NativePgPoolProvider(runtime.connectionString);
  const transactions = new NativePgTransactionRunner(pools);
  let closed = false;
  let closePromise: Promise<void> | undefined;

  return {
    async list(input) {
      assertOpen(closed);
      return pools.withPool((pool) => listTickets(pool, validateList(input)));
    },
    async get(input) {
      assertOpen(closed);
      if (input === null || typeof input !== 'object') validation('get input must be an object');
      return pools.withPool((pool) => getTicket(pool, positiveIntegerString(input.id, 'id')));
    },
    async create(input) {
      assertOpen(closed);
      validateCreate(input);
      return pools.withPool((pool) => createTicket(pool, input));
    },
    async assign(input) {
      assertOpen(closed);
      if (input === null || typeof input !== 'object') validation('assign input must be an object');
      const id = positiveIntegerString(input.id, 'id');
      validAssignee(input.assignee);
      const assigned = await assignTicket(transactions, id, input.assignee);
      if (assigned === null) {
        throw new CandidateApplicationError('NOT_FOUND', 'Ticket was not found');
      }
      return assigned;
    },
    close() {
      if (closePromise === undefined) {
        closePromise = pools.close().then(() => {
          closed = true;
        });
      }
      return closePromise;
    },
  };
}
