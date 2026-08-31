import type { Pool } from 'pg';
import { assignWithAudit, findTicket, insertTicket, listTickets, type ListFilters, type TicketStatus } from '../data-access/ticket-data-access.js';
import type { TicketDto } from '../contracts/ticket-dto.js';

export class ApplicationError extends Error {
  readonly code: 'VALIDATION' | 'NOT_FOUND' | 'APPLICATION_CLOSED';
  constructor(code: ApplicationError['code'], message: string) {
    super(message);
    this.code = code;
  }
}

const statuses = new Set<TicketStatus>(['open', 'pending', 'closed']);
const sorts = new Set(['id', 'priority', 'createdAt']);
const directions = new Set(['asc', 'desc']);

function positiveIdentifier(value: string, name: string): void {
  if (!/^[1-9][0-9]*$/.test(value)) throw new ApplicationError('VALIDATION', `${name} must be a positive integer string`);
}

function listInput(input: ListFilters = {}): ListFilters {
  if (input.status !== undefined && !statuses.has(input.status)) throw new ApplicationError('VALIDATION', 'unsupported status');
  if (input.sort !== undefined && !sorts.has(input.sort)) throw new ApplicationError('VALIDATION', 'unsupported sort');
  if (input.direction !== undefined && !directions.has(input.direction)) throw new ApplicationError('VALIDATION', 'unsupported sort direction');
  if (input.offset !== undefined && (!Number.isInteger(input.offset) || input.offset < 0 || input.offset > 10_000)) throw new ApplicationError('VALIDATION', 'offset out of range');
  if (input.limit !== undefined && (!Number.isInteger(input.limit) || input.limit < 1 || input.limit > 100)) throw new ApplicationError('VALIDATION', 'limit out of range');
  if (input.assignee !== undefined && input.assignee !== null && typeof input.assignee !== 'string') throw new ApplicationError('VALIDATION', 'assignee must be a string or null');
  return input;
}

export function createTicketService(pool: Pool) {
  return {
    list: (input?: ListFilters): Promise<TicketDto[]> => listTickets(pool, listInput(input)),
    get: async (input: { id: string }): Promise<TicketDto | null> => {
      positiveIdentifier(input.id, 'id');
      return findTicket(pool, input.id);
    },
    create: async (input: { title: string; status: TicketStatus; assignee: string | null; priority: number; metadata?: Record<string, unknown> }): Promise<TicketDto> => {
      if (typeof input.title !== 'string' || input.title.length === 0 || !statuses.has(input.status) || (input.assignee !== null && typeof input.assignee !== 'string') || !Number.isInteger(input.priority) || input.priority < 1 || input.priority > 5) throw new ApplicationError('VALIDATION', 'invalid ticket input');
      return insertTicket(pool, { ...input, metadata: input.metadata ?? {} });
    },
    assign: async (input: { id: string; assignee: string | null }): Promise<{ id: string; assignee: string | null }> => {
      positiveIdentifier(input.id, 'id');
      if (input.assignee !== null && typeof input.assignee !== 'string') throw new ApplicationError('VALIDATION', 'assignee must be a string or null');
      const assigned = await assignWithAudit(pool, input.id, input.assignee);
      if (assigned === null) throw new ApplicationError('NOT_FOUND', 'ticket not found');
      return assigned;
    },
  };
}
