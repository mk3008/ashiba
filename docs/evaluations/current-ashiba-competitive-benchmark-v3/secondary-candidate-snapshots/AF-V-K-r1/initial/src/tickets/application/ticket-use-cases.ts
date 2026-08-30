import { applicationError } from '../../application.js';
import type { TicketDto } from '../dto.js';
import type { AssignTicketInput, CreateTicketInput, ListTicketsInput } from '../types.js';
import type { TicketStore } from '../infrastructure/kysely-ticket-store.js';

/** Feature-local application boundary for the frozen G1 ticket operations. */
export class TicketUseCases {
  public constructor(private readonly tickets: TicketStore) {}
  public async list(input?: ListTicketsInput): Promise<TicketDto[]> {
    validateList(input); return this.tickets.list(input);
  }
  public async get(input: { id: string }): Promise<TicketDto | null> {
    validateTicketId(input?.id); return this.tickets.get(input.id);
  }
  public async create(input: CreateTicketInput): Promise<TicketDto> {
    validateCreate(input); return this.tickets.create(input);
  }
  public async assign(input: AssignTicketInput): Promise<{ id: string; assignee: string | null }> {
    validateTicketId(input?.id); validateAssignee(input?.assignee); return this.tickets.assign(input);
  }
}

const statuses = new Set(['open', 'pending', 'closed']);
const sorts = new Set(['id', 'priority', 'createdAt']);
const directions = new Set(['asc', 'desc']);

function validateList(input: ListTicketsInput | undefined): void {
  if (input === undefined) return;
  if (input === null || typeof input !== 'object') throw validationError('list input must be an object');
  if (input.status !== undefined && !statuses.has(input.status)) throw validationError('status is invalid');
  if (input.assignee !== undefined) validateAssignee(input.assignee);
  if (input.sort !== undefined && !sorts.has(input.sort)) throw validationError('sort is invalid');
  if (input.direction !== undefined && !directions.has(input.direction)) throw validationError('direction is invalid');
  if (input.offset !== undefined && (!Number.isInteger(input.offset) || input.offset < 0 || input.offset > 10_000)) throw validationError('offset must be an integer from 0 through 10000');
  if (input.limit !== undefined && (!Number.isInteger(input.limit) || input.limit < 1 || input.limit > 100)) throw validationError('limit must be an integer from 1 through 100');
}

function validateCreate(input: CreateTicketInput): void {
  if (input === null || typeof input !== 'object' || typeof input.title !== 'string') throw validationError('title must be a string');
  if (!statuses.has(input.status)) throw validationError('status is invalid');
  validateAssignee(input.assignee);
  if (!Number.isInteger(input.priority) || input.priority < 1 || input.priority > 5) throw validationError('priority must be an integer from 1 through 5');
  if (input.metadata !== undefined && !isJsonObject(input.metadata)) throw validationError('metadata must be a JSON object');
}

function validateTicketId(id: unknown): asserts id is string {
  if (typeof id !== 'string' || !/^[1-9][0-9]*$/.test(id)) throw validationError('id must be a positive base-10 integer string');
}
function validateAssignee(assignee: unknown): asserts assignee is string | null {
  if (assignee !== null && typeof assignee !== 'string') throw validationError('assignee must be a string or null');
}
function isJsonObject(value: unknown): value is Record<string, unknown> {
  if (value === null || Array.isArray(value) || typeof value !== 'object') return false;
  try { JSON.stringify(value); return true; } catch { return false; }
}
function validationError(message: string): Error & { code: 'VALIDATION' } {
  return applicationError('VALIDATION', message);
}
