import { Pool } from 'pg';
import { NativePgPoolProvider } from './platform/pool.js';
import { NativePgTransactionRunner } from './platform/transaction.js';
import { TicketUseCases } from './tickets/application/ticket-use-cases.js';
import type { CreateTicketParams, ListTicketsParams } from './tickets/sql/generated/tickets.sql.js';

type TicketStatus = 'open' | 'pending' | 'closed';
type TicketSort = 'id' | 'priority' | 'createdAt';
type SortDirection = 'asc' | 'desc';
export interface Runtime { connectionString: string; schema: string; }
export interface Ticket { id: string; title: string; status: TicketStatus; assignee: string | null; priority: number; createdAt: string; metadata: Record<string, unknown>; }
export interface Application {
  list(input?: ListInput): Promise<Ticket[]>;
  get(input: { id: string }): Promise<Ticket | null>;
  create(input: CreateInput): Promise<Ticket>;
  assign(input: { id: string; assignee: string | null }): Promise<{ id: string; assignee: string | null }>;
  close(): Promise<void>;
}
export interface ListInput { status?: TicketStatus; assignee?: string | null; sort?: TicketSort; direction?: SortDirection; offset?: number; limit?: number; }
export interface CreateInput { title: string; status: TicketStatus; assignee: string | null; priority: number; metadata?: Record<string, unknown>; }

export function createApplication(runtime: Runtime): Application {
  const pool = new Pool({ connectionString: runtime.connectionString });
  const poolProvider = new NativePgPoolProvider(pool);
  const tickets = new TicketUseCases(pool, new NativePgTransactionRunner(pool));
  let closed = false;
  const ensureOpen = (): void => { if (closed) throw applicationError('APPLICATION_CLOSED', 'application is closed'); };
  return {
    async list(input = {}): Promise<Ticket[]> {
      ensureOpen();
      return poolProvider.withPool(async () => tickets.list(toListParams(input)));
    },
    async get(input): Promise<Ticket | null> {
      ensureOpen(); assertId(input?.id, 'id'); return tickets.get(input.id);
    },
    async create(input): Promise<Ticket> { ensureOpen(); return tickets.create(toCreateParams(input)); },
    async assign(input): Promise<{ id: string; assignee: string | null }> {
      ensureOpen(); assertId(input?.id, 'id'); assertAssignee(input.assignee);
      const assigned = await tickets.assign(input.id, input.assignee);
      if (assigned === null) throw applicationError('NOT_FOUND', 'ticket not found');
      return assigned;
    },
    async close(): Promise<void> { if (closed) return; closed = true; await pool.end(); },
  };
}

function toListParams(input: ListInput): ListTicketsParams {
  if (input === null || typeof input !== 'object') validation('list input must be an object');
  const status = input.status;
  if (status !== undefined && !isStatus(status)) validation('invalid status');
  const hasAssignee = Object.prototype.hasOwnProperty.call(input, 'assignee');
  if (hasAssignee) assertAssignee(input.assignee);
  const sort = input.sort ?? 'id'; const direction = input.direction ?? 'asc';
  if (!isSort(sort) || !isDirection(direction)) validation('invalid sort');
  const offset = input.offset ?? 0; const limit = input.limit ?? 100;
  if (!Number.isInteger(offset) || offset < 0 || offset > 10_000) validation('invalid offset');
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) validation('invalid limit');
  return { status: status ?? null, hasAssignee, assignee: hasAssignee ? input.assignee ?? null : null, sort, direction, offset, limit };
}
function toCreateParams(input: CreateInput): CreateTicketParams {
  if (input === null || typeof input !== 'object' || typeof input.title !== 'string') validation('invalid title');
  if (!isStatus(input.status)) validation('invalid status'); assertAssignee(input.assignee);
  if (!Number.isInteger(input.priority) || input.priority < 1 || input.priority > 5) validation('invalid priority');
  const metadata = input.metadata ?? {}; if (!isJsonObject(metadata)) validation('invalid metadata');
  return { title: input.title, status: input.status, assignee: input.assignee, priority: input.priority, metadata: JSON.stringify(metadata) };
}
function assertId(value: unknown, name: string): asserts value is string {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) validation(`invalid ${name}`);
  try { if (BigInt(value) > 9_223_372_036_854_775_807n) validation(`invalid ${name}`); } catch { validation(`invalid ${name}`); }
}
function assertAssignee(value: unknown): asserts value is string | null { if (value !== null && typeof value !== 'string') validation('invalid assignee'); }
function isStatus(value: unknown): value is TicketStatus { return value === 'open' || value === 'pending' || value === 'closed'; }
function isSort(value: unknown): value is TicketSort { return value === 'id' || value === 'priority' || value === 'createdAt'; }
function isDirection(value: unknown): value is SortDirection { return value === 'asc' || value === 'desc'; }
function isJsonObject(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === 'object' && !Array.isArray(value) && isJsonValue(value); }
function isJsonValue(value: unknown): boolean {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (typeof value !== 'object') return false;
  return Object.values(value as Record<string, unknown>).every(isJsonValue);
}
function validation(message: string): never { throw applicationError('VALIDATION', message); }
function applicationError(code: 'VALIDATION' | 'NOT_FOUND' | 'APPLICATION_CLOSED', message: string): Error & { code: typeof code } { return Object.assign(new Error(message), { code }); }
