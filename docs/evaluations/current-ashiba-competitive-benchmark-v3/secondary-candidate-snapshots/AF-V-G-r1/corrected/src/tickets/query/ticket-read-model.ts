import type { Pool, QueryResultRow } from 'pg';

import { toTicketDto, type TicketDto, type TicketRow, type TicketStatus } from '../dto.js';

/** Feature-local query seam. Canonical SQL lives inside this ticket slice. */
export const ticketReadModelBoundary = 'feature-local';

export type TicketSort = 'id' | 'priority' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

export interface ListTicketsInput {
  status?: TicketStatus;
  assignee?: string | null;
  sort?: TicketSort;
  direction?: SortDirection;
  offset?: number;
  limit?: number;
}

const sortColumns: Record<TicketSort, string> = {
  id: 'id',
  priority: 'priority',
  createdAt: 'created_at',
};

const sortDirections: Record<SortDirection, string> = {
  asc: 'ASC',
  desc: 'DESC',
};

const ticketProjection = `
  id,
  title,
  status,
  assignee,
  priority,
  created_at,
  metadata
`;

export async function listTickets(pool: Pool, input: ListTicketsInput): Promise<TicketDto[]> {
  const values: unknown[] = [];
  const predicates: string[] = [];

  if (input.status !== undefined) {
    values.push(input.status);
    predicates.push(`status = $${values.length}`);
  }
  if (input.assignee !== undefined) {
    if (input.assignee === null) {
      predicates.push('assignee IS NULL');
    } else {
      values.push(input.assignee);
      predicates.push(`assignee = $${values.length}`);
    }
  }

  const sort = input.sort ?? 'id';
  const direction = input.direction ?? 'asc';
  values.push(input.offset ?? 0, input.limit ?? 100);
  const offsetParameter = `$${values.length - 1}`;
  const limitParameter = `$${values.length}`;
  const whereClause = predicates.length === 0 ? '' : `WHERE ${predicates.join(' AND ')}`;
  const sql = `
    SELECT ${ticketProjection}
    FROM tickets
    ${whereClause}
    ORDER BY ${sortColumns[sort]} ${sortDirections[direction]}, id ASC
    OFFSET ${offsetParameter}
    LIMIT ${limitParameter}
  `;
  const result = await pool.query<TicketRow>(sql, values);
  return result.rows.map(toTicketDto);
}

export async function getTicket(pool: Pool, id: string): Promise<TicketDto | null> {
  const result = await pool.query<TicketRow>(`
    SELECT ${ticketProjection}
    FROM tickets
    WHERE id = $1
  `, [id]);
  const row = result.rows[0];
  return row === undefined ? null : toTicketDto(row);
}

export function ticketFromRow(row: QueryResultRow): TicketDto {
  return toTicketDto(row as TicketRow);
}
