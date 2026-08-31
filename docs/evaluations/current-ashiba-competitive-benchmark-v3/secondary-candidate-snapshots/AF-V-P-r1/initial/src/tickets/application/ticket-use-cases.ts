import postgres from '@prisma/orm-postgres/runtime';
import { defineContract } from '@prisma/orm-postgres/contract-builder';
import { param } from '@prisma/orm-postgres/relational-core';

import type { TicketDto } from '../dto.js';

/** Feature-local use-case seam. */
export const ticketUseCaseBoundary = 'vertical-slice';

export type TicketStatus = 'open' | 'pending' | 'closed';
export type TicketSort = 'id' | 'priority' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

export interface Runtime {
  connectionString: string;
  schema: string;
}

export interface ApplicationError extends Error {
  code: 'VALIDATION' | 'NOT_FOUND' | 'APPLICATION_CLOSED';
}

export interface TicketApplication {
  list(input?: ListInput): Promise<TicketDto[]>;
  get(input: { id: string }): Promise<TicketDto | null>;
  create(input: CreateInput): Promise<TicketDto>;
  assign(input: AssignInput): Promise<{ id: string; assignee: string | null }>;
  close(): Promise<void>;
}

interface ListInput {
  status?: TicketStatus;
  assignee?: string | null;
  sort?: TicketSort;
  direction?: SortDirection;
  offset?: number;
  limit?: number;
}

interface CreateInput {
  title: string;
  status: TicketStatus;
  assignee: string | null;
  priority: number;
  metadata?: Record<string, unknown>;
}

interface AssignInput {
  id: string;
  assignee: string | null;
}

type TicketRow = {
  id: bigint;
  title: string;
  status: string;
  assignee: string | null;
  priority: number;
  createdAt: string;
  metadata: unknown;
};

type AssignmentRow = {
  id: bigint;
  assignee: string | null;
};

const TICKET_ROW = {
  id: 'pg/int8@1',
  title: 'pg/text@1',
  status: 'pg/text@1',
  assignee: { codecId: 'pg/text@1', nullable: true },
  priority: 'pg/int4@1',
  createdAt: 'pg/timestamptz-string@1',
  metadata: 'pg/jsonb@1',
} as const;

const ASSIGNMENT_ROW = {
  id: 'pg/int8@1',
  assignee: { codecId: 'pg/text@1', nullable: true },
} as const;

const MAX_INT64 = 9_223_372_036_854_775_807n;

export function createTicketApplication(runtime: Runtime): TicketApplication {
  const database = postgres({
    // This intentionally empty contract supplies Prisma's built-in PostgreSQL
    // codecs while this externally-owned schema is accessed through raw SQL.
    contract: defineContract({}),
    url: runtime.connectionString,
  });
  let closed = false;

  const assertOpen = (): void => {
    if (closed) {
      throw applicationError('APPLICATION_CLOSED', 'Application is closed');
    }
  };

  return {
    async list(input: ListInput = {}): Promise<TicketDto[]> {
      assertOpen();
      const options = validateListInput(input);
      const plan = database.raw.sql`
        SELECT id, title, status::text AS "status", assignee, priority,
               created_at AS "createdAt", metadata
        FROM tickets
        WHERE (
          ${param(options.status ?? null, { codecId: 'pg/text@1' })}::ticket_status IS NULL
          OR status = ${param(options.status ?? null, { codecId: 'pg/text@1' })}::ticket_status
        )
        AND (
          ${param(options.assignee !== undefined, { codecId: 'pg/bool@1' })} = FALSE
          OR (
            (${param(options.assignee ?? null, { codecId: 'pg/text@1' })}::text IS NULL AND assignee IS NULL)
            OR assignee = ${param(options.assignee ?? null, { codecId: 'pg/text@1' })}
          )
        )
        ORDER BY
          CASE WHEN ${param(options.sort, { codecId: 'pg/text@1' })} = 'id'
                 AND ${param(options.direction, { codecId: 'pg/text@1' })} = 'asc' THEN id END ASC,
          CASE WHEN ${param(options.sort, { codecId: 'pg/text@1' })} = 'id'
                 AND ${param(options.direction, { codecId: 'pg/text@1' })} = 'desc' THEN id END DESC,
          CASE WHEN ${param(options.sort, { codecId: 'pg/text@1' })} = 'priority'
                 AND ${param(options.direction, { codecId: 'pg/text@1' })} = 'asc' THEN priority END ASC,
          CASE WHEN ${param(options.sort, { codecId: 'pg/text@1' })} = 'priority'
                 AND ${param(options.direction, { codecId: 'pg/text@1' })} = 'desc' THEN priority END DESC,
          CASE WHEN ${param(options.sort, { codecId: 'pg/text@1' })} = 'createdAt'
                 AND ${param(options.direction, { codecId: 'pg/text@1' })} = 'asc' THEN created_at END ASC,
          CASE WHEN ${param(options.sort, { codecId: 'pg/text@1' })} = 'createdAt'
                 AND ${param(options.direction, { codecId: 'pg/text@1' })} = 'desc' THEN created_at END DESC,
          id ASC
        LIMIT ${param(options.limit, { codecId: 'pg/int4@1' })}
        OFFSET ${param(options.offset, { codecId: 'pg/int4@1' })}
      `.returnsRow(TICKET_ROW).build();
      return (await database.runtime().query(plan)).map(toTicket);
    },

    async get(input: { id: string }): Promise<TicketDto | null> {
      assertOpen();
      const id = parsePositiveId(input?.id);
      const plan = database.raw.sql`
        SELECT id, title, status::text AS "status", assignee, priority,
               created_at AS "createdAt", metadata
        FROM tickets
        WHERE id = ${param(id, { codecId: 'pg/int8@1' })}
      `.returnsRow(TICKET_ROW).build();
      const rows = await database.runtime().query(plan);
      return rows.length === 0 ? null : toTicket(rows[0]);
    },

    async create(input: CreateInput): Promise<TicketDto> {
      assertOpen();
      const value = validateCreateInput(input);
      const now = new Date().toISOString();
      const plan = database.raw.sql`
        INSERT INTO tickets (title, status, assignee, priority, created_at, metadata)
        VALUES (
          ${param(value.title, { codecId: 'pg/text@1' })},
          ${param(value.status, { codecId: 'pg/text@1' })}::ticket_status,
          ${param(value.assignee, { codecId: 'pg/text@1' })},
          ${param(value.priority, { codecId: 'pg/int4@1' })},
          ${param(now, { codecId: 'pg/timestamptz-string@1' })},
          ${param(value.metadata, { codecId: 'pg/jsonb@1' })}
        )
        RETURNING id, title, status::text AS "status", assignee, priority,
                  created_at AS "createdAt", metadata
      `.returnsRow(TICKET_ROW).build();
      const rows = await database.runtime().query(plan);
      return toTicket(rows[0]);
    },

    async assign(input: AssignInput): Promise<{ id: string; assignee: string | null }> {
      assertOpen();
      const value = validateAssignInput(input);
      return database.transaction(async (transaction) => {
        const updatePlan = database.raw.sql`
          UPDATE tickets
          SET assignee = ${param(value.assignee, { codecId: 'pg/text@1' })}
          WHERE id = ${param(value.id, { codecId: 'pg/int8@1' })}
          RETURNING id, assignee
        `.returnsRow(ASSIGNMENT_ROW).build();
        const updates = await transaction.query(updatePlan);
        const updated = updates[0];
        if (updated === undefined) {
          throw applicationError('NOT_FOUND', 'Ticket not found');
        }

        const auditPlan = database.raw.sql`
          INSERT INTO ticket_audit (ticket_id, action, detail, created_at)
          VALUES (
            ${param(value.id, { codecId: 'pg/int8@1' })},
            ${param('assigned', { codecId: 'pg/text@1' })},
            ${param(value.assignee ?? '', { codecId: 'pg/text@1' })},
            ${param(new Date().toISOString(), { codecId: 'pg/timestamptz-string@1' })}
          )
        `.affectedCount().build();
        await transaction.execute(auditPlan);

        return { id: updated.id.toString(), assignee: updated.assignee };
      });
    },

    async close(): Promise<void> {
      if (closed) {
        return;
      }
      closed = true;
      await database.close();
    },
  };
}

function applicationError(code: ApplicationError['code'], message: string): ApplicationError {
  return Object.assign(new Error(message), { code });
}

function validateListInput(input: ListInput): Required<Pick<ListInput, 'sort' | 'direction' | 'offset' | 'limit'>> & Pick<ListInput, 'status' | 'assignee'> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw applicationError('VALIDATION', 'List input must be an object');
  }
  const status = input.status;
  const assignee = input.assignee;
  const sort = input.sort ?? 'id';
  const direction = input.direction ?? 'asc';
  const offset = input.offset ?? 0;
  const limit = input.limit ?? 100;

  if (status !== undefined && !isTicketStatus(status)) {
    throw applicationError('VALIDATION', 'Unsupported ticket status');
  }
  if (assignee !== undefined && assignee !== null && typeof assignee !== 'string') {
    throw applicationError('VALIDATION', 'Assignee must be a string or null');
  }
  if (!isTicketSort(sort) || !isSortDirection(direction)) {
    throw applicationError('VALIDATION', 'Unsupported sort');
  }
  if (!Number.isInteger(offset) || offset < 0 || offset > 10_000 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw applicationError('VALIDATION', 'Pagination is out of range');
  }
  return { status, assignee, sort, direction, offset, limit };
}

function validateCreateInput(input: CreateInput): Required<CreateInput> {
  if (!isRecord(input) || typeof input.title !== 'string' || !isTicketStatus(input.status) || (input.assignee !== null && typeof input.assignee !== 'string') || !Number.isInteger(input.priority) || input.priority < 1 || input.priority > 5) {
    throw applicationError('VALIDATION', 'Invalid ticket input');
  }
  const metadata = input.metadata ?? {};
  if (!isJsonRecord(metadata)) {
    throw applicationError('VALIDATION', 'Metadata must be JSON-safe');
  }
  return { title: input.title, status: input.status, assignee: input.assignee, priority: input.priority, metadata };
}

function validateAssignInput(input: AssignInput): { id: bigint; assignee: string | null } {
  if (!isRecord(input) || (input.assignee !== null && typeof input.assignee !== 'string')) {
    throw applicationError('VALIDATION', 'Invalid assignment input');
  }
  return { id: parsePositiveId(input.id), assignee: input.assignee };
}

function parsePositiveId(value: unknown): bigint {
  if (typeof value !== 'string' || !/^[1-9][0-9]*$/.test(value)) {
    throw applicationError('VALIDATION', 'Identifier must be a positive integer string');
  }
  const id = BigInt(value);
  if (id > MAX_INT64) {
    throw applicationError('VALIDATION', 'Identifier exceeds PostgreSQL bigint range');
  }
  return id;
}

function toTicket(row: TicketRow): TicketDto {
  if (!isJsonRecord(row.metadata) || !isTicketStatus(row.status)) {
    throw new Error('Database returned an invalid ticket row');
  }
  return {
    id: row.id.toString(),
    title: row.title,
    status: row.status,
    assignee: row.assignee,
    priority: row.priority,
    createdAt: new Date(row.createdAt).toISOString(),
    metadata: row.metadata,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isJsonRecord(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && isJsonValue(value);
}

function isJsonValue(value: unknown): boolean {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return true;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value);
  }
  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }
  return isRecord(value) && Object.values(value).every(isJsonValue);
}

function isTicketStatus(value: unknown): value is TicketStatus {
  return value === 'open' || value === 'pending' || value === 'closed';
}

function isTicketSort(value: unknown): value is TicketSort {
  return value === 'id' || value === 'priority' || value === 'createdAt';
}

function isSortDirection(value: unknown): value is SortDirection {
  return value === 'asc' || value === 'desc';
}
