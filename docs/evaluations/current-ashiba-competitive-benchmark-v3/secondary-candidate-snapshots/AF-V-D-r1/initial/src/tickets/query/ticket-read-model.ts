import { sql, type SQL } from 'drizzle-orm';

import type { DrizzleDatabase } from '../../platform/transaction.js';
import { toTicketDto, type TicketDto, type TicketStatus } from '../dto.js';

/** Feature-local query seam. Canonical SQL may live inside this ticket slice. */
export const ticketReadModelBoundary = 'feature-local';

export type TicketSort = 'id' | 'priority' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

export interface ListTicketsInput {
  status?: TicketStatus;
  assignee?: string | null;
  sort: TicketSort;
  direction: SortDirection;
  offset: number;
  limit: number;
}

const ORDER_BY: Readonly<Record<TicketSort, SQL>> = {
  id: sql.raw('id'),
  priority: sql.raw('priority'),
  createdAt: sql.raw('created_at'),
};
const DIRECTION: Readonly<Record<SortDirection, SQL>> = { asc: sql.raw('ASC'), desc: sql.raw('DESC') };

export class TicketReadModel {
  constructor(private readonly database: DrizzleDatabase) {}

  async list(input: ListTicketsInput): Promise<TicketDto[]> {
    const predicates: SQL[] = [];
    if (input.status !== undefined) predicates.push(sql`status = ${input.status}::ticket_status`);
    if (input.assignee !== undefined) predicates.push(input.assignee === null ? sql`assignee IS NULL` : sql`assignee = ${input.assignee}`);
    const whereClause = predicates.length === 0 ? sql`` : sql`WHERE ${sql.join(predicates, sql` AND `)}`;
    const result = await this.database.execute(sql`
      SELECT id::text AS id, title, status::text AS status, assignee, priority, created_at, metadata
      FROM tickets ${whereClause}
      ORDER BY ${ORDER_BY[input.sort]} ${DIRECTION[input.direction]}, id ASC
      LIMIT ${input.limit} OFFSET ${input.offset}
    `);
    return (result.rows as unknown[]).map((row) => toTicketDto(row as Parameters<typeof toTicketDto>[0]));
  }

  async get(id: string): Promise<TicketDto | null> {
    const result = await this.database.execute(sql`
      SELECT id::text AS id, title, status::text AS status, assignee, priority, created_at, metadata
      FROM tickets WHERE id = ${id}::bigint
    `);
    const row = (result.rows as unknown[])[0];
    return row === undefined ? null : toTicketDto(row as Parameters<typeof toTicketDto>[0]);
  }
}
