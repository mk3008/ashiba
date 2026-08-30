import type { Pool, PoolClient } from 'pg';
import type { TicketDto } from '../contracts/ticket-dto.js';
import { TicketDataAccess, type CreateInput, type ListInput } from '../data-access/ticket-data-access.js';

export class ApplicationError extends Error {
  constructor(readonly code: 'VALIDATION' | 'NOT_FOUND' | 'APPLICATION_CLOSED' | 'INSUFFICIENT_FUNDS', message: string) {
    super(message);
  }
}

function positiveId(value: unknown, label: string): string {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) throw new ApplicationError('VALIDATION', `${label} must be a positive integer string`);
  return value;
}

function status(value: unknown): TicketDto['status'] {
  if (value === 'open' || value === 'pending' || value === 'closed') return value;
  throw new ApplicationError('VALIDATION', 'status is invalid');
}

function listInput(value: unknown): ListInput {
  const input = (value ?? {}) as Record<string, unknown>;
  const sort = input.sort ?? 'id';
  const direction = input.direction ?? 'asc';
  const offset = input.offset ?? 0;
  const limit = input.limit ?? 20;
  if (sort !== 'id' && sort !== 'priority' && sort !== 'createdAt') throw new ApplicationError('VALIDATION', 'sort is invalid');
  if (direction !== 'asc' && direction !== 'desc') throw new ApplicationError('VALIDATION', 'direction is invalid');
  if (!Number.isInteger(offset) || offset < 0 || offset > 10_000) throw new ApplicationError('VALIDATION', 'offset is invalid');
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new ApplicationError('VALIDATION', 'limit is invalid');
  if (input.status !== undefined) status(input.status);
  if (Object.hasOwn(input, 'assignee') && input.assignee !== null && typeof input.assignee !== 'string') throw new ApplicationError('VALIDATION', 'assignee is invalid');
  return {
    status: input.status as TicketDto['status'] | undefined,
    ...(Object.hasOwn(input, 'assignee') ? { assignee: input.assignee as string | null } : {}),
    sort,
    direction,
    offset,
    limit,
  };
}

export function createTicketService(pool: Pool, dataAccess: TicketDataAccess) {
  let closed = false;
  const assertOpen = () => {
    if (closed) throw new ApplicationError('APPLICATION_CLOSED', 'application is closed');
  };
  return {
    async list(input?: unknown) {
      assertOpen();
      return dataAccess.list(listInput(input));
    },
    async get(input: unknown) {
      assertOpen();
      return dataAccess.get(positiveId((input as Record<string, unknown> | undefined)?.id, 'id'));
    },
    async create(input: unknown) {
      assertOpen();
      const value = input as Record<string, unknown>;
      if (typeof value?.title !== 'string' || value.title.length === 0) throw new ApplicationError('VALIDATION', 'title is invalid');
      if (value.assignee !== null && typeof value.assignee !== 'string') throw new ApplicationError('VALIDATION', 'assignee is invalid');
      if (!Number.isInteger(value.priority) || (value.priority as number) < 1 || (value.priority as number) > 5) throw new ApplicationError('VALIDATION', 'priority is invalid');
      if (value.metadata !== undefined && (typeof value.metadata !== 'object' || value.metadata === null || Array.isArray(value.metadata))) throw new ApplicationError('VALIDATION', 'metadata is invalid');
      return dataAccess.create({
        title: value.title,
        status: status(value.status),
        assignee: value.assignee as string | null,
        priority: value.priority as number,
        metadata: (value.metadata ?? {}) as Record<string, unknown>,
      } satisfies CreateInput);
    },
    async assign(input: unknown) {
      assertOpen();
      const value = input as Record<string, unknown>;
      const id = positiveId(value?.id, 'id');
      if (value.assignee !== null && typeof value.assignee !== 'string') throw new ApplicationError('VALIDATION', 'assignee is invalid');
      const client: PoolClient = await pool.connect();
      try {
        await client.query('BEGIN');
        const assigned = await dataAccess.assign(client, id, value.assignee as string | null);
        if (!assigned) {
          await client.query('ROLLBACK');
          throw new ApplicationError('NOT_FOUND', 'ticket does not exist');
        }
        await client.query('COMMIT');
        return assigned;
      } catch (error) {
        try { await client.query('ROLLBACK'); } catch { /* transaction may already have been rolled back */ }
        throw error;
      } finally {
        client.release();
      }
    },
    async close() {
      if (!closed) {
        closed = true;
        await pool.end();
      }
    },
  };
}
