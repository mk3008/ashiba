import type { PoolProvider } from '../../platform/pool.js';
import type { TransactionRunner } from '../../platform/transaction.js';
import type { TicketDto } from '../dto.js';
import { TicketQueries, type TicketRow } from '../sql/generated/queries.js';

export const ticketUseCaseBoundary = 'vertical-slice';

type TicketStatus = 'open' | 'pending' | 'closed';
type TicketSort = 'id' | 'priority' | 'createdAt';
type SortDirection = 'asc' | 'desc';
type Closed = () => boolean;

export class CandidateApplicationError extends Error {
  constructor(readonly code: 'VALIDATION' | 'NOT_FOUND' | 'APPLICATION_CLOSED') {
    super(code);
    this.name = 'CandidateApplicationError';
  }
}

export class TicketUseCases {
  constructor(
    private readonly pools: PoolProvider,
    private readonly transactions: TransactionRunner,
    private readonly queries: TicketQueries,
  ) {}

  async list(input: unknown, isClosed: Closed): Promise<TicketDto[]> {
    this.assertOpen(isClosed);
    const value = input === undefined ? {} : this.object(input);
    const status = this.optionalStatus(value.status);
    const assigneeSelected = Object.prototype.hasOwnProperty.call(value, 'assignee');
    const assignee = assigneeSelected ? this.assignee(value.assignee) : null;
    const sort = this.sort(value.sort);
    const direction = this.direction(value.direction);
    const offset = this.boundedInteger(value.offset, 0, 10_000, 0);
    const limit = this.boundedInteger(value.limit, 1, 100, 100);
    return this.pools.withPool(async (pool) => {
      const rows = await this.queries.listTickets(pool, {
        filterStatusActive: status !== undefined,
        filterStatus: status ?? 'open',
        filterAssigneeActive: assigneeSelected,
        filterAssignee: assignee,
        sort,
        direction,
        offset,
        limit,
      });
      return rows.map((row) => this.dto(row));
    });
  }

  async get(input: unknown, isClosed: Closed): Promise<TicketDto | null> {
    this.assertOpen(isClosed);
    const id = this.id(this.object(input).id);
    return this.pools.withPool(async (pool) => {
      const row = await this.queries.getTicket(pool, id);
      return row === null ? null : this.dto(row);
    });
  }

  async create(input: unknown, isClosed: Closed): Promise<TicketDto> {
    this.assertOpen(isClosed);
    const value = this.object(input);
    const title = this.string(value.title);
    const status = this.status(value.status);
    const assignee = this.assignee(value.assignee);
    const priority = this.boundedInteger(value.priority, 1, 5);
    const metadata = value.metadata === undefined ? {} : this.metadata(value.metadata);
    return this.pools.withPool(async (pool) => this.dto(await this.queries.createTicket(pool, {
      title, status, assignee, priority, metadata,
    })));
  }

  async assign(input: unknown, isClosed: Closed): Promise<{ id: string; assignee: string | null }> {
    this.assertOpen(isClosed);
    const value = this.object(input);
    const id = this.id(value.id);
    const assignee = this.assignee(value.assignee);
    return this.transactions.inTransaction(async (client) => {
      const updated = await this.queries.assignTicket(client, id, assignee);
      if (updated === null) throw new CandidateApplicationError('NOT_FOUND');
      await this.queries.insertTicketAudit(client, id, JSON.stringify({ assignee }));
      return updated;
    });
  }

  private assertOpen(isClosed: Closed): void {
    if (isClosed()) throw new CandidateApplicationError('APPLICATION_CLOSED');
  }

  private object(value: unknown): Record<string, unknown> {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) this.invalid();
    return value as Record<string, unknown>;
  }

  private id(value: unknown): string {
    if (typeof value !== 'string' || !/^\d+$/.test(value) || BigInt(value) <= 0n) this.invalid();
    return value;
  }

  private string(value: unknown): string {
    if (typeof value !== 'string') this.invalid();
    return value;
  }

  private assignee(value: unknown): string | null {
    if (value === null || typeof value === 'string') return value;
    this.invalid();
  }

  private status(value: unknown): TicketStatus {
    if (value === 'open' || value === 'pending' || value === 'closed') return value;
    this.invalid();
  }

  private optionalStatus(value: unknown): TicketStatus | undefined {
    if (value === undefined) return undefined;
    return this.status(value);
  }

  private sort(value: unknown): TicketSort {
    if (value === undefined) return 'id';
    if (value === 'id' || value === 'priority' || value === 'createdAt') return value;
    this.invalid();
  }

  private direction(value: unknown): SortDirection {
    if (value === undefined) return 'asc';
    if (value === 'asc' || value === 'desc') return value;
    this.invalid();
  }

  private boundedInteger(value: unknown, minimum: number, maximum: number, fallback?: number): number {
    if (value === undefined && fallback !== undefined) return fallback;
    if (typeof value !== 'number' || !Number.isInteger(value) || value < minimum || value > maximum) this.invalid();
    return value;
  }

  private metadata(value: unknown): Record<string, unknown> {
    if (!this.jsonSafe(value) || value === null || Array.isArray(value) || typeof value !== 'object') this.invalid();
    return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
  }

  private jsonSafe(value: unknown): boolean {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
    if (typeof value === 'number') return Number.isFinite(value);
    if (Array.isArray(value)) return value.every((item) => this.jsonSafe(item));
    if (typeof value === 'object') {
      const prototype = Object.getPrototypeOf(value);
      return (prototype === Object.prototype || prototype === null)
        && Object.values(value as Record<string, unknown>).every((item) => this.jsonSafe(item));
    }
    return false;
  }

  private dto(row: TicketRow): TicketDto {
    const createdAt = row.created_at instanceof Date ? row.created_at.toISOString() : new Date(row.created_at).toISOString();
    return {
      id: row.id,
      title: row.title,
      status: this.status(row.status),
      assignee: row.assignee,
      priority: row.priority,
      createdAt,
      metadata: row.metadata,
    };
  }

  private invalid(): never {
    throw new CandidateApplicationError('VALIDATION');
  }
}
