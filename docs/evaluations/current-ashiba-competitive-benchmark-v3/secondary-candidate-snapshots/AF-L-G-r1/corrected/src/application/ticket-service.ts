import type { CreateTicketInput, ListTicketsInput, SortDirection, TicketDto, TicketSort, TicketStatus } from '../contracts/ticket-dto.js';
import { TicketDataAccess } from '../data-access/ticket-data-access.js';
import type { PoolProvider } from '../platform/pool.js';
import type { TransactionRunner } from '../platform/transaction.js';

/** Application-service seam. Validation and use-case policy remain application-owned. */
export const ticketServiceBoundary = 'application-owned';

export class ApplicationError extends Error {
  public constructor(public readonly code: 'VALIDATION' | 'NOT_FOUND' | 'APPLICATION_CLOSED') {
    super(code);
    this.name = 'ApplicationError';
  }
}

const statuses = new Set<TicketStatus>(['open', 'pending', 'closed']);
const sorts = new Set<TicketSort>(['id', 'priority', 'createdAt']);
const directions = new Set<SortDirection>(['asc', 'desc']);
const MAX_BIGINT = 9_223_372_036_854_775_807n;

function invalid(): never {
  throw new ApplicationError('VALIDATION');
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

function isJsonSafe(value: unknown, seen = new Set<object>()): boolean {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every((item) => isJsonSafe(item, seen));
  if (!isPlainObject(value) || seen.has(value)) return false;
  seen.add(value);
  try {
    return Object.values(value).every((item) => isJsonSafe(item, seen));
  } finally {
    seen.delete(value);
  }
}

function positiveId(value: unknown): string {
  if (typeof value !== 'string' || !/^[1-9][0-9]*$/.test(value)) return invalid();
  try {
    if (BigInt(value) > MAX_BIGINT) return invalid();
  } catch {
    return invalid();
  }
  return value;
}

function requiredString(value: unknown): string {
  return typeof value === 'string' ? value : invalid();
}

function nullableString(value: unknown): string | null {
  return value === null || typeof value === 'string' ? value : invalid();
}

function enumMember<T extends string>(value: unknown, allowed: ReadonlySet<T>): T {
  return typeof value === 'string' && allowed.has(value as T) ? value as T : invalid();
}

function validInteger(value: unknown, minimum: number, maximum: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= minimum && value <= maximum ? value : invalid();
}

export class TicketService {
  public constructor(
    private readonly pools: PoolProvider,
    private readonly dataAccess: TicketDataAccess,
    private readonly transactions: TransactionRunner,
  ) {}

  public async list(input?: ListTicketsInput): Promise<TicketDto[]> {
    if (input !== undefined && !isPlainObject(input)) return invalid();
    const value = input ?? {};
    const status = value.status === undefined ? undefined : enumMember(value.status, statuses);
    const assignee = value.assignee === undefined ? undefined : nullableString(value.assignee);
    const sort = value.sort === undefined ? 'id' : enumMember(value.sort, sorts);
    const direction = value.direction === undefined ? 'asc' : enumMember(value.direction, directions);
    const offset = value.offset === undefined ? 0 : validInteger(value.offset, 0, 10_000);
    const limit = value.limit === undefined ? 100 : validInteger(value.limit, 1, 100);
    return this.pools.withPool((pool) => this.dataAccess.list(pool, { status, assignee, sort, direction, offset, limit }));
  }

  public async get(input: { id: string }): Promise<TicketDto | null> {
    if (!isPlainObject(input)) return invalid();
    return this.pools.withPool((pool) => this.dataAccess.get(pool, positiveId(input.id)));
  }

  public async create(input: CreateTicketInput): Promise<TicketDto> {
    if (!isPlainObject(input)) return invalid();
    const status = enumMember(input.status, statuses);
    const metadata = input.metadata === undefined ? undefined : isPlainObject(input.metadata) && isJsonSafe(input.metadata) ? input.metadata : invalid();
    return this.pools.withPool((pool) => this.dataAccess.create(pool, {
      title: requiredString(input.title),
      status,
      assignee: nullableString(input.assignee),
      priority: validInteger(input.priority, 1, 5),
      metadata,
    }));
  }

  public async assign(input: { id: string; assignee: string | null }): Promise<{ id: string; assignee: string | null }> {
    if (!isPlainObject(input)) return invalid();
    const id = positiveId(input.id);
    const assignee = nullableString(input.assignee);
    const result = await this.transactions.inTransaction((client) => this.dataAccess.assign(client, id, assignee));
    if (result === null) throw new ApplicationError('NOT_FOUND');
    return result;
  }
}
