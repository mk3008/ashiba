import type { Kysely } from 'kysely';

import type { TicketDto } from '../dto.js';
import {
  getTicketRow,
  listTicketRows,
  ticketFromRow,
  type Database,
  type ListTicketsInput,
  type NormalizedListTicketsInput,
} from '../query/ticket-read-model.js';

export interface TicketApplication {
  list(input?: ListTicketsInput): Promise<TicketDto[]>;
  get(input: { id: string }): Promise<TicketDto | null>;
  create(input: CreateTicketInput): Promise<TicketDto>;
  assign(input: AssignTicketInput): Promise<{ id: string; assignee: string | null }>;
  close(): Promise<void>;
}

export interface CreateTicketInput {
  title: string;
  status: TicketDto['status'];
  assignee: string | null;
  priority: number;
  metadata?: Record<string, unknown>;
}

export interface AssignTicketInput {
  id: string;
  assignee: string | null;
}

export interface ApplicationError extends Error {
  code: 'VALIDATION' | 'NOT_FOUND' | 'APPLICATION_CLOSED';
}

class TicketError extends Error implements ApplicationError {
  public readonly code: ApplicationError['code'];

  public constructor(code: ApplicationError['code'], message: string) {
    super(message);
    this.name = 'ApplicationError';
    this.code = code;
  }
}

const statuses: readonly TicketDto['status'][] = ['open', 'pending', 'closed'];
const sorts = ['id', 'priority', 'createdAt'] as const;
const directions = ['asc', 'desc'] as const;

function validation(message: string): never {
  throw new TicketError('VALIDATION', message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function positiveId(value: unknown, field: string): string {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    return validation(`${field} must be a positive base-10 integer string`);
  }
  return value;
}

function stringOrNull(value: unknown, field: string): string | null {
  if (value !== null && typeof value !== 'string') {
    return validation(`${field} must be a string or null`);
  }
  return value;
}

function requireOpen(open: boolean): void {
  if (!open) {
    throw new TicketError('APPLICATION_CLOSED', 'The application is closed');
  }
}

function normalizeListInput(input: ListTicketsInput | undefined): NormalizedListTicketsInput {
  if (input !== undefined && !isRecord(input)) {
    return validation('list input must be an object');
  }

  const source: ListTicketsInput = input ?? {};
  if (source.status !== undefined && !statuses.includes(source.status)) {
    return validation('status is invalid');
  }
  if (source.assignee !== undefined) {
    stringOrNull(source.assignee, 'assignee');
  }
  if (source.sort !== undefined && !sorts.includes(source.sort)) {
    return validation('sort is invalid');
  }
  if (source.direction !== undefined && !directions.includes(source.direction)) {
    return validation('direction is invalid');
  }
  if (source.offset !== undefined && (!Number.isInteger(source.offset) || source.offset < 0 || source.offset > 10_000)) {
    return validation('offset must be an integer from 0 through 10000');
  }
  if (source.limit !== undefined && (!Number.isInteger(source.limit) || source.limit < 1 || source.limit > 100)) {
    return validation('limit must be an integer from 1 through 100');
  }

  return {
    status: source.status,
    assignee: source.assignee,
    sort: source.sort ?? 'id',
    direction: source.direction ?? 'asc',
    offset: source.offset ?? 0,
    limit: source.limit ?? 100,
  };
}

function normalizeCreateInput(input: CreateTicketInput): Required<CreateTicketInput> {
  if (!isRecord(input) || typeof input.title !== 'string') {
    return validation('title must be a string');
  }
  if (!statuses.includes(input.status)) {
    return validation('status is invalid');
  }
  const assignee = stringOrNull(input.assignee, 'assignee');
  if (!Number.isInteger(input.priority) || input.priority < 1 || input.priority > 5) {
    return validation('priority must be an integer from 1 through 5');
  }
  if (input.metadata !== undefined && !isRecord(input.metadata)) {
    return validation('metadata must be an object');
  }
  return {
    title: input.title,
    status: input.status,
    assignee,
    priority: input.priority,
    metadata: input.metadata ?? {},
  };
}

function normalizeAssignInput(input: AssignTicketInput): AssignTicketInput {
  if (!isRecord(input)) {
    return validation('assign input must be an object');
  }
  return {
    id: positiveId(input.id, 'id'),
    assignee: stringOrNull(input.assignee, 'assignee'),
  };
}

export function createTicketUseCases(database: Kysely<Database>): TicketApplication {
  let open = true;
  let closed: Promise<void> | undefined;

  return {
    async list(input) {
      requireOpen(open);
      return listTicketRows(database, normalizeListInput(input));
    },

    async get(input) {
      requireOpen(open);
      if (!isRecord(input)) {
        return validation('get input must be an object');
      }
      return getTicketRow(database, positiveId(input.id, 'id'));
    },

    async create(input) {
      requireOpen(open);
      const ticket = normalizeCreateInput(input);
      const row = await database
        .insertInto('tickets')
        .values({
          title: ticket.title,
          status: ticket.status,
          assignee: ticket.assignee,
          priority: ticket.priority,
          created_at: new Date(),
          metadata: JSON.stringify(ticket.metadata),
        })
        .returning(['id', 'title', 'status', 'assignee', 'priority', 'created_at', 'metadata'])
        .executeTakeFirstOrThrow();
      return ticketFromRow(row);
    },

    async assign(input) {
      requireOpen(open);
      const assignment = normalizeAssignInput(input);
      return database.transaction().execute(async (transaction) => {
        const updated = await transaction
          .updateTable('tickets')
          .set({ assignee: assignment.assignee })
          .where('id', '=', assignment.id)
          .returning(['id', 'assignee'])
          .executeTakeFirst();

        if (updated === undefined) {
          throw new TicketError('NOT_FOUND', `Ticket ${assignment.id} was not found`);
        }

        await transaction
          .insertInto('ticket_audit')
          .values({
            ticket_id: updated.id,
            action: 'assigned',
            detail: JSON.stringify({ assignee: updated.assignee }),
            created_at: new Date(),
          })
          .execute();

        return { id: String(updated.id), assignee: updated.assignee };
      });
    },

    close() {
      if (closed === undefined) {
        open = false;
        closed = database.destroy();
      }
      return closed;
    },
  };
}
