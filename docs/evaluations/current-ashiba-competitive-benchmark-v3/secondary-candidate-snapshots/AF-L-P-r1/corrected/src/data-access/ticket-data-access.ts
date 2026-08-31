import type { PostgresRuntime } from '@prisma/orm-postgres/runtime';
import { param } from '@prisma/orm-postgres/relational-core';
import type {
  AssignTicketInput,
  CreateTicketInput,
  ListTicketsInput,
  TicketDto,
} from '../contracts/ticket-dto.js';
import { TicketApplicationError } from '../contracts/ticket-dto.js';
import type { PrismaTicketClient } from '../platform/pool.js';
import type { TransactionRunner } from '../platform/transaction.js';

/** Data-access seam. Canonical Prisma raw-query code remains in this ordinary layer. */
export const ticketDataAccessBoundary = 'layered';

const ticketRow = {
  id: 'pg/text@1',
  title: 'pg/text@1',
  status: 'pg/text@1',
  assignee: { codecId: 'pg/text@1', nullable: true },
  priority: 'pg/int4@1',
  createdAt: 'pg/timestamptz-string@1',
  metadata: 'pg/jsonb@1',
} as const;

const assignmentRow = {
  id: 'pg/text@1',
  assignee: { codecId: 'pg/text@1', nullable: true },
} as const;

type QueryRuntime = Pick<PostgresRuntime, 'query' | 'execute'>;

function nullableText(value: string | null) {
  return param(value, { codecId: 'pg/text@1' });
}

function asTicket(row: {
  id: string;
  title: string;
  status: string;
  assignee: string | null;
  priority: number;
  createdAt: string;
  metadata: unknown;
}): TicketDto {
  return {
    id: row.id,
    title: row.title,
    status: row.status as TicketDto['status'],
    assignee: row.assignee,
    priority: row.priority,
    createdAt: row.createdAt,
    metadata: row.metadata as Record<string, unknown>,
  };
}

function queryRuntime(client: unknown): QueryRuntime {
  return client as QueryRuntime;
}

/**
 * PostgreSQL-specific queries stay in Prisma's supported raw lane because the
 * runner-owned brownfield schema has no generated Prisma contract artefacts.
 * Values are interpolated into Prisma's tagged template and therefore bound.
 */
export class TicketDataAccess {
  constructor(
    private readonly db: PrismaTicketClient,
    private readonly transactions: TransactionRunner,
  ) {}

  async list(input: Required<Pick<ListTicketsInput, 'sort' | 'direction' | 'offset' | 'limit'>> & ListTicketsInput): Promise<TicketDto[]> {
    const hasStatus = input.status !== undefined;
    const hasAssignee = input.assignee !== undefined;
    const nullAssignee = input.assignee === null;
    const rows = await this.db.runtime().query(
      this.db.raw.sql`
        SELECT
          id::text AS "id", title AS "title", status::text AS "status",
          assignee AS "assignee", priority AS "priority",
          created_at AS "createdAt", metadata AS "metadata"
        FROM tickets
        WHERE (${!hasStatus} OR status = ${input.status ?? 'open'})
          AND (
            ${!hasAssignee}
            OR (${nullAssignee} AND assignee IS NULL)
            OR (${!nullAssignee} AND assignee = ${input.assignee ?? ''})
          )
        ORDER BY
          CASE WHEN ${input.sort === 'id' && input.direction === 'asc'} THEN id END ASC,
          CASE WHEN ${input.sort === 'id' && input.direction === 'desc'} THEN id END DESC,
          CASE WHEN ${input.sort === 'priority' && input.direction === 'asc'} THEN priority END ASC,
          CASE WHEN ${input.sort === 'priority' && input.direction === 'desc'} THEN priority END DESC,
          CASE WHEN ${input.sort === 'createdAt' && input.direction === 'asc'} THEN created_at END ASC,
          CASE WHEN ${input.sort === 'createdAt' && input.direction === 'desc'} THEN created_at END DESC,
          id ASC
        OFFSET ${input.offset}
        LIMIT ${input.limit}
      `.returnsRow(ticketRow).build(),
    );
    return rows.map(asTicket);
  }

  async get(id: bigint): Promise<TicketDto | null> {
    const rows = await this.db.runtime().query(
      this.db.raw.sql`
        SELECT
          id::text AS "id", title AS "title", status::text AS "status",
          assignee AS "assignee", priority AS "priority",
          created_at AS "createdAt", metadata AS "metadata"
        FROM tickets
        WHERE id = ${id}
        LIMIT 1
      `.returnsRow(ticketRow).build(),
    );
    return rows.length === 0 ? null : asTicket(rows[0]!);
  }

  async create(input: CreateTicketInput): Promise<TicketDto> {
    const metadata = JSON.stringify(input.metadata ?? {});
    const rows = await this.db.runtime().query(
      this.db.raw.sql`
        INSERT INTO tickets (title, status, assignee, priority, created_at, metadata)
        VALUES (${input.title}, ${input.status}, ${nullableText(input.assignee)}, ${input.priority}, CURRENT_TIMESTAMP, ${metadata}::jsonb)
        RETURNING
          id::text AS "id", title AS "title", status::text AS "status",
          assignee AS "assignee", priority AS "priority",
          created_at AS "createdAt", metadata AS "metadata"
      `.returnsRow(ticketRow).build(),
    );
    return asTicket(rows[0]!);
  }

  async assign(input: AssignTicketInput, id: bigint): Promise<{ id: string; assignee: string | null }> {
    return this.transactions.inTransaction(async (transaction) => {
      const tx = queryRuntime(transaction);
      const rows = await tx.query(
        this.db.raw.sql`
          UPDATE tickets
          SET assignee = ${nullableText(input.assignee)}
          WHERE id = ${id}
          RETURNING id::text AS "id", assignee AS "assignee"
        `.returnsRow(assignmentRow).build(),
      );
      const assigned = rows[0];
      if (assigned === undefined) {
        throw new TicketApplicationError('NOT_FOUND', 'Ticket not found');
      }
      await tx.execute(
        this.db.raw.sql`
          INSERT INTO ticket_audit (ticket_id, action, detail, created_at)
          VALUES (${id}, 'assigned', ${nullableText(input.assignee)}, CURRENT_TIMESTAMP)
        `.affectedCount().build(),
      );
      return assigned;
    });
  }
}
