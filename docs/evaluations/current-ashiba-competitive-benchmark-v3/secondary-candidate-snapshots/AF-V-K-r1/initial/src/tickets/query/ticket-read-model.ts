import type { SelectQueryBuilder } from 'kysely';
import type { ListTicketsInput } from '../types.js';
import type { Database, TicketRow } from '../infrastructure/kysely-ticket-store.js';

const sortColumns = { id: 'id', priority: 'priority', createdAt: 'created_at' } as const;

/** The finite sort mapping is source-controlled; request values never become SQL. */
export function ticketListQuery(
  db: SelectQueryBuilder<Database, 'tickets', TicketRow>,
  input: ListTicketsInput | undefined,
): SelectQueryBuilder<Database, 'tickets', TicketRow> {
  let query = db;
  if (input?.status !== undefined) query = query.where('status', '=', input.status);
  if (input?.assignee !== undefined) {
    query = input.assignee === null ? query.where('assignee', 'is', null) : query.where('assignee', '=', input.assignee);
  }
  const sort = input?.sort ?? 'id';
  const direction = input?.direction ?? 'asc';
  query = query.orderBy(sortColumns[sort], direction).orderBy('id', 'asc');
  if (input?.offset !== undefined) query = query.offset(input.offset);
  return query.limit(input?.limit ?? 100);
}
