import { drizzle } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';

import { ApplicationPoolProvider } from './platform/pool.js';
import { DrizzleTransactionRunner, type DrizzleDatabase } from './platform/transaction.js';
import { ApplicationError, TicketUseCases, type CreateTicketInput } from './tickets/application/ticket-use-cases.js';
import { TicketReadModel, type ListTicketsInput, type SortDirection, type TicketSort } from './tickets/query/ticket-read-model.js';
import type { TicketDto, TicketStatus } from './tickets/dto.js';

export interface Runtime { connectionString: string; schema: string; }

export interface Application {
  list(input?: { status?: TicketStatus; assignee?: string | null; sort?: TicketSort; direction?: SortDirection; offset?: number; limit?: number }): Promise<TicketDto[]>;
  get(input: { id: string }): Promise<TicketDto | null>;
  create(input: CreateTicketInput): Promise<TicketDto>;
  assign(input: { id: string; assignee: string | null }): Promise<{ id: string; assignee: string | null }>;
  close(): Promise<void>;
}

const STATUSES: readonly TicketStatus[] = ['open', 'pending', 'closed'];
const SORTS: readonly TicketSort[] = ['id', 'priority', 'createdAt'];
const DIRECTIONS: readonly SortDirection[] = ['asc', 'desc'];
const MAX_BIGINT = 9_223_372_036_854_775_807n;

function invalid(message: string): never { throw new ApplicationError('VALIDATION', message); }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function object(value: unknown, name: string): Record<string, unknown> { return isRecord(value) ? value : invalid(`${name} must be an object`); }
function json(value: unknown): boolean {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(json);
  return isRecord(value) && Object.values(value).every(json);
}
function id(value: unknown): string {
  if (typeof value !== 'string' || !/^[1-9][0-9]*$/.test(value) || BigInt(value) > MAX_BIGINT) invalid('id must be a positive bigint string');
  return value;
}
function status(value: unknown, required = false): TicketStatus | undefined {
  if (value === undefined && !required) return undefined;
  return STATUSES.includes(value as TicketStatus) ? value as TicketStatus : invalid('status is invalid');
}
function assignee(value: unknown, optional = false): string | null | undefined {
  if (value === undefined && optional) return undefined;
  return value === null || typeof value === 'string' ? value : invalid('assignee must be a string or null');
}
function integer(value: unknown, lower: number, upper: number, fallback?: number): number {
  if (value === undefined && fallback !== undefined) return fallback;
  return typeof value === 'number' && Number.isInteger(value) && value >= lower && value <= upper ? value : invalid('integer is out of range');
}
function listInput(input: unknown): ListTicketsInput {
  const value = input === undefined ? {} : object(input, 'input');
  const sort = value.sort === undefined ? 'id' : SORTS.includes(value.sort as TicketSort) ? value.sort as TicketSort : invalid('sort is invalid');
  const direction = value.direction === undefined ? 'asc' : DIRECTIONS.includes(value.direction as SortDirection) ? value.direction as SortDirection : invalid('direction is invalid');
  return { status: status(value.status), assignee: assignee(value.assignee, true), sort, direction, offset: integer(value.offset, 0, 10_000, 0), limit: integer(value.limit, 1, 100, 100) };
}
function createInput(input: unknown): CreateTicketInput {
  const value = object(input, 'input');
  if (typeof value.title !== 'string') invalid('title must be a string');
  const ticketStatus = status(value.status, true);
  const ticketAssignee = assignee(value.assignee);
  if (!isRecord(value.metadata ?? {}) || !json(value.metadata ?? {})) invalid('metadata must be a JSON-safe object');
  return { title: value.title, status: ticketStatus as TicketStatus, assignee: ticketAssignee as string | null, priority: integer(value.priority, 1, 5), metadata: value.metadata as Record<string, unknown> | undefined };
}
function assignInput(input: unknown): { id: string; assignee: string | null } {
  const value = object(input, 'input');
  return { id: id(value.id), assignee: assignee(value.assignee) as string | null };
}

/** Composes the ordinary ticket slice with Drizzle SQL and transaction APIs. */
export async function createApplication(runtime: Runtime): Promise<Application> {
  if (!isRecord(runtime) || typeof runtime.connectionString !== 'string' || runtime.connectionString.length === 0 || typeof runtime.schema !== 'string') invalid('runtime is invalid');
  const poolProvider = new ApplicationPoolProvider(runtime.connectionString);
  const database = await poolProvider.withPool(async (pool) => drizzle({ client: pool as Pool }) as DrizzleDatabase);
  const readModel = new TicketReadModel(database);
  const useCases = new TicketUseCases(database, new DrizzleTransactionRunner(database));
  let closed = false;
  let closePromise: Promise<void> | undefined;
  const open = (): void => { if (closed) throw new ApplicationError('APPLICATION_CLOSED', 'Application is closed'); };
  return {
    async list(input) { open(); return readModel.list(listInput(input)); },
    async get(input) { open(); return readModel.get(id(object(input, 'input').id)); },
    async create(input) { open(); return useCases.create(createInput(input)); },
    async assign(input) { open(); return useCases.assign(assignInput(input)); },
    async close() { if (closePromise === undefined) { closed = true; closePromise = poolProvider.close(); } await closePromise; },
  };
}
