import { bindNamedParameters } from '@ashiba-ts/named-parameters';
import { compileNamedParameters } from '@ashiba-ts/named-parameters/compiler';
import type { PoolClient, QueryResultRow } from 'pg';

import type { TransactionRunner } from '../../platform/transaction.js';
import type { TicketDto } from '../dto.js';
import { findTicket, listTicketRows, toTicketDto, type TicketListInput, type TicketQueryClient } from '../query/ticket-read-model.js';

/** Feature-local use-case seam. Implement ticket operations here or beside it. */
export const ticketUseCaseBoundary = 'vertical-slice';

export class TicketApplicationError extends Error {
  constructor(readonly code: 'VALIDATION' | 'NOT_FOUND') {
    super(code);
    this.name = 'TicketApplicationError';
  }
}

const insertTicket = compileNamedParameters(`
  INSERT INTO tickets (title, status, assignee, priority, created_at, metadata)
  VALUES (:title, :status, :assignee, :priority, CURRENT_TIMESTAMP, :metadata::jsonb)
  RETURNING id, title, status, assignee, priority, created_at, metadata
`);

const assignTicket = compileNamedParameters(`
  UPDATE tickets
  SET assignee = :assignee
  WHERE id = :id
  RETURNING id, assignee
`);

const insertAssignmentAudit = compileNamedParameters(`
  INSERT INTO ticket_audit (ticket_id, action, detail, created_at)
  VALUES (:ticketId, 'assign', :detail, CURRENT_TIMESTAMP)
`);

export type CreateTicketInput = {
  title: string;
  status: TicketDto['status'];
  assignee: string | null;
  priority: number;
  metadata?: Record<string, unknown>;
};

type NormalizedListInput = {
  status?: TicketDto['status'];
  assignee?: string | null;
  sort: 'id' | 'priority' | 'createdAt';
  direction: 'asc' | 'desc';
  offset: number;
  limit: number;
};

export class TicketUseCases {
  constructor(
    private readonly queryClient: TicketQueryClient,
    private readonly transactions: TransactionRunner,
  ) {}

  list(input?: TicketListInput): Promise<TicketDto[]> {
    return listTicketRows(this.queryClient, normalizeListInput(input));
  }

  get(id: string): Promise<TicketDto | null> {
    validatePositiveIntegerString(id);
    return findTicket(this.queryClient, id);
  }

  async create(input: CreateTicketInput): Promise<TicketDto> {
    validateCreateInput(input);
    const metadata = JSON.stringify(input.metadata ?? {});
    if (metadata === undefined) {
      throw new TicketApplicationError('VALIDATION');
    }
    const bound = bindNamedParameters(insertTicket, {
      title: input.title,
      status: input.status,
      assignee: input.assignee,
      priority: input.priority,
      metadata,
    });
    const result = await this.queryClient.query<TicketRow>({ text: bound.sql, values: [...bound.values] });
    const row = result.rows[0];
    if (!row) {
      throw new Error('ticket insert returned no row');
    }
    return toTicketDto(row);
  }

  async assign(input: { id: string; assignee: string | null }): Promise<{ id: string; assignee: string | null }> {
    validatePositiveIntegerString(input.id);
    if (typeof input.assignee !== 'string' && input.assignee !== null) {
      throw new TicketApplicationError('VALIDATION');
    }

    return this.transactions.inTransaction(async (client) => {
      const update = bindNamedParameters(assignTicket, { id: input.id, assignee: input.assignee });
      const updated = await client.query<AssignmentRow>({ text: update.sql, values: [...update.values] });
      const ticket = updated.rows[0];
      if (!ticket) {
        throw new TicketApplicationError('NOT_FOUND');
      }

      const audit = bindNamedParameters(insertAssignmentAudit, {
        ticketId: ticket.id,
        detail: JSON.stringify({ assignee: input.assignee }),
      });
      await client.query({ text: audit.sql, values: [...audit.values] });
      return { id: String(ticket.id), assignee: ticket.assignee };
    });
  }
}

type TicketRow = QueryResultRow & {
  id: string | number;
  title: string;
  status: TicketDto['status'];
  assignee: string | null;
  priority: number;
  created_at: Date | string;
  metadata: unknown;
};

type AssignmentRow = QueryResultRow & { id: string | number; assignee: string | null };

function normalizeListInput(input: TicketListInput | undefined): NormalizedListInput {
  if (input !== undefined && (typeof input !== 'object' || input === null || Array.isArray(input))) {
    throw new TicketApplicationError('VALIDATION');
  }
  const value = input ?? {};
  const status = value.status;
  const assignee = value.assignee;
  const sort = value.sort ?? 'id';
  const direction = value.direction ?? 'asc';
  const offset = value.offset ?? 0;
  const limit = value.limit ?? 100;

  if (status !== undefined && status !== 'open' && status !== 'pending' && status !== 'closed') {
    throw new TicketApplicationError('VALIDATION');
  }
  if (assignee !== undefined && assignee !== null && typeof assignee !== 'string') {
    throw new TicketApplicationError('VALIDATION');
  }
  if (sort !== 'id' && sort !== 'priority' && sort !== 'createdAt') {
    throw new TicketApplicationError('VALIDATION');
  }
  if (direction !== 'asc' && direction !== 'desc') {
    throw new TicketApplicationError('VALIDATION');
  }
  if (!Number.isInteger(offset) || offset < 0 || offset > 10_000) {
    throw new TicketApplicationError('VALIDATION');
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new TicketApplicationError('VALIDATION');
  }
  return { status, assignee, sort, direction, offset, limit };
}

function validateCreateInput(input: CreateTicketInput): void {
  if (
    typeof input !== 'object' || input === null ||
    typeof input.title !== 'string' ||
    (input.status !== 'open' && input.status !== 'pending' && input.status !== 'closed') ||
    (typeof input.assignee !== 'string' && input.assignee !== null) ||
    !Number.isInteger(input.priority) || input.priority < 1 || input.priority > 5 ||
    (input.metadata !== undefined && !isJsonRecord(input.metadata))
  ) {
    throw new TicketApplicationError('VALIDATION');
  }
  try {
    JSON.stringify(input.metadata ?? {});
  } catch {
    throw new TicketApplicationError('VALIDATION');
  }
}

function validatePositiveIntegerString(value: unknown): asserts value is string {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw new TicketApplicationError('VALIDATION');
  }
  try {
    const parsed = BigInt(value);
    if (parsed <= 0n || parsed > 9_223_372_036_854_775_807n) {
      throw new TicketApplicationError('VALIDATION');
    }
  } catch (error) {
    if (error instanceof TicketApplicationError) {
      throw error;
    }
    throw new TicketApplicationError('VALIDATION');
  }
}

function isJsonRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
