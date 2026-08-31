import { and, asc, desc, eq, isNull, sql, type SQL } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import type { CreateTicketInput, TicketDto, TicketListInput, TicketStatus } from '../dto.js';
import { ticketReadModel } from '../query/ticket-read-model.js';

const statuses = new Set<TicketStatus>(['open', 'pending', 'closed']);
const positiveId = /^[1-9][0-9]*$/;
const maximumBigInt = 9_223_372_036_854_775_807n;

type TicketTables = ReturnType<typeof ticketReadModel>;
type TicketRow = {
  id: bigint;
  title: string;
  status: TicketStatus;
  assignee: string | null;
  priority: number;
  createdAt: Date;
  metadata: Record<string, unknown>;
};

export class TicketApplicationError extends Error {
  constructor(
    readonly code: 'VALIDATION' | 'NOT_FOUND' | 'APPLICATION_CLOSED',
    message: string,
  ) {
    super(message);
    this.name = 'TicketApplicationError';
  }
}

function validation(message: string): never {
  throw new TicketApplicationError('VALIDATION', message);
}

function parseId(value: unknown): bigint {
  if (typeof value !== 'string' || !positiveId.test(value)) {
    return validation('id must be a positive base-10 integer string');
  }
  const id = BigInt(value);
  if (id > maximumBigInt) return validation('id exceeds PostgreSQL bigint range');
  return id;
}

function isMetadata(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  try {
    JSON.stringify(value);
    return true;
  } catch {
    return false;
  }
}

function toTicket(row: TicketRow): TicketDto {
  return {
    id: row.id.toString(),
    title: row.title,
    status: row.status,
    assignee: row.assignee,
    priority: row.priority,
    createdAt: row.createdAt.toISOString(),
    metadata: row.metadata,
  };
}

export class TicketUseCases {
  constructor(
    private readonly db: NodePgDatabase,
    private readonly tables: TicketTables,
    private readonly ensureOpen: () => void,
  ) {}

  async list(input: TicketListInput | undefined = undefined): Promise<TicketDto[]> {
    this.ensureOpen();
    if (input !== undefined && (typeof input !== 'object' || input === null || Array.isArray(input))) {
      return validation('list input must be an object');
    }
    const status = input?.status;
    if (status !== undefined && !statuses.has(status)) validation('unsupported ticket status');
    const assignee = input?.assignee;
    if (assignee !== undefined && assignee !== null && typeof assignee !== 'string') validation('assignee must be a string or null');
    const sort = input?.sort ?? 'id';
    if (sort !== 'id' && sort !== 'priority' && sort !== 'createdAt') validation('unsupported sort');
    const direction = input?.direction ?? 'asc';
    if (direction !== 'asc' && direction !== 'desc') validation('unsupported direction');
    const offset = input?.offset ?? 0;
    const limit = input?.limit ?? 100;
    if (!Number.isInteger(offset) || offset < 0 || offset > 10_000) validation('offset is out of range');
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) validation('limit is out of range');

    const { tickets } = this.tables;
    const conditions: SQL[] = [];
    if (status !== undefined) conditions.push(eq(tickets.status, status));
    if (assignee !== undefined) {
      conditions.push(assignee === null ? isNull(tickets.assignee) : eq(tickets.assignee, assignee));
    }
    const column = sort === 'id' ? tickets.id : sort === 'priority' ? tickets.priority : tickets.createdAt;
    const primaryOrder = direction === 'asc' ? asc(column) : desc(column);
    const rows = await this.db.select().from(tickets)
      .where(conditions.length === 0 ? undefined : and(...conditions))
      .orderBy(primaryOrder, asc(tickets.id))
      .offset(offset)
      .limit(limit);
    return (rows as TicketRow[]).map(toTicket);
  }

  async get(input: { id: string }): Promise<TicketDto | null> {
    this.ensureOpen();
    const id = parseId(input?.id);
    const { tickets } = this.tables;
    const [row] = await this.db.select().from(tickets).where(eq(tickets.id, id)).limit(1);
    return row === undefined ? null : toTicket(row as TicketRow);
  }

  async create(input: CreateTicketInput): Promise<TicketDto> {
    this.ensureOpen();
    if (typeof input !== 'object' || input === null) validation('create input must be an object');
    if (typeof input.title !== 'string') validation('title must be a string');
    if (!statuses.has(input.status)) validation('unsupported ticket status');
    if (input.assignee !== null && typeof input.assignee !== 'string') validation('assignee must be a string or null');
    if (!Number.isInteger(input.priority) || input.priority < 1 || input.priority > 5) validation('priority is out of range');
    if (input.metadata !== undefined && !isMetadata(input.metadata)) validation('metadata must be a JSON object');

    const [row] = await this.db.insert(this.tables.tickets).values({
      title: input.title,
      status: input.status,
      assignee: input.assignee,
      priority: input.priority,
      metadata: input.metadata ?? {},
      createdAt: sql`now()`,
    }).returning();
    return toTicket(row as TicketRow);
  }

  async assign(input: { id: string; assignee: string | null }): Promise<{ id: string; assignee: string | null }> {
    this.ensureOpen();
    if (typeof input !== 'object' || input === null) validation('assign input must be an object');
    const id = parseId(input.id);
    if (input.assignee !== null && typeof input.assignee !== 'string') validation('assignee must be a string or null');

    const { tickets, ticketAudit } = this.tables;
    return this.db.transaction(async (transaction) => {
      const [updated] = await transaction.update(tickets).set({ assignee: input.assignee }).where(eq(tickets.id, id)).returning({
        id: tickets.id,
        assignee: tickets.assignee,
      });
      if (updated === undefined) throw new TicketApplicationError('NOT_FOUND', 'ticket was not found');
      await transaction.insert(ticketAudit).values({
        ticketId: updated.id,
        action: 'assign',
        detail: JSON.stringify({ assignee: updated.assignee }),
        createdAt: sql`now()`,
      });
      return { id: updated.id.toString(), assignee: updated.assignee };
    });
  }
}
