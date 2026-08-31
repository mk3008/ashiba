import type { ColumnType, Generated, Kysely, SelectQueryBuilder } from 'kysely';

import type { TicketDto } from '../dto.js';

export interface TicketsTable {
  id: Generated<string>;
  title: string;
  status: TicketDto['status'];
  assignee: string | null;
  priority: number;
  created_at: Date;
  metadata: ColumnType<Record<string, unknown>, string, string>;
}

export interface TicketAuditTable {
  audit_id: Generated<string>;
  ticket_id: string;
  action: string;
  detail: string;
  created_at: Date;
}

export interface Database {
  tickets: TicketsTable;
  ticket_audit: TicketAuditTable;
}

export interface ListTicketsInput {
  status?: TicketDto['status'];
  assignee?: string | null;
  sort?: 'id' | 'priority' | 'createdAt';
  direction?: 'asc' | 'desc';
  offset?: number;
  limit?: number;
}

export interface NormalizedListTicketsInput {
  status?: TicketDto['status'];
  assignee?: string | null;
  sort: 'id' | 'priority' | 'createdAt';
  direction: 'asc' | 'desc';
  offset: number;
  limit: number;
}

type TicketSelection = {
  id: string;
  title: string;
  status: TicketDto['status'];
  assignee: string | null;
  priority: number;
  created_at: Date;
  metadata: Record<string, unknown>;
};

export function ticketFromRow(row: TicketSelection): TicketDto {
  return {
    id: String(row.id),
    title: row.title,
    status: row.status,
    assignee: row.assignee,
    priority: row.priority,
    createdAt: new Date(row.created_at).toISOString(),
    metadata: row.metadata,
  };
}

export async function listTicketRows(
  database: Kysely<Database>,
  input: NormalizedListTicketsInput,
): Promise<TicketDto[]> {
  let query: SelectQueryBuilder<Database, 'tickets', TicketSelection> = database
    .selectFrom('tickets')
    .select(['id', 'title', 'status', 'assignee', 'priority', 'created_at', 'metadata']);

  if (input.status !== undefined) {
    query = query.where('status', '=', input.status);
  }
  if (input.assignee !== undefined) {
    query = input.assignee === null
      ? query.where('assignee', 'is', null)
      : query.where('assignee', '=', input.assignee);
  }

  const sortColumn: 'id' | 'priority' | 'created_at' = input.sort === 'priority'
    ? 'priority'
    : input.sort === 'createdAt'
      ? 'created_at'
      : 'id';

  const rows = await query
    .orderBy(sortColumn, input.direction)
    .orderBy('id', 'asc')
    .offset(input.offset)
    .limit(input.limit)
    .execute();

  return rows.map(ticketFromRow);
}

export async function getTicketRow(
  database: Kysely<Database>,
  id: string,
): Promise<TicketDto | null> {
  const row = await database
    .selectFrom('tickets')
    .select(['id', 'title', 'status', 'assignee', 'priority', 'created_at', 'metadata'])
    .where('id', '=', id)
    .executeTakeFirst();

  return row === undefined ? null : ticketFromRow(row);
}
