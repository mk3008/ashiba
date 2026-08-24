import { preparePostgresQuery, type AshibaPostgresQuerySource } from '@ashiba-ts/driver-adapter-pg';
import type { Pool } from 'pg';
import { queryModels } from './generated/query-models.js';
import { listSql } from './generated/sql-text.js';
import { placeTicketOrdering, type SortInput } from './ordering.js';
import type { ListTicketsSqlParams, Ticket } from './types.js';

const query: AshibaPostgresQuerySource<ListTicketsSqlParams, Ticket> = { sql: listSql, queryModel: queryModels.list };
export type AssigneeFilter = undefined | null | string;
export type ListTicketsInput = { status?: string; customerId?: string; assignee?: AssigneeFilter; limit?: number; offset?: number; sort?: SortInput[] };

export async function listTickets(pool: Pool, input: ListTicketsInput = {}): Promise<Ticket[]> {
  const assigneeMode = input.assignee === undefined ? 'any' : input.assignee === null ? 'unassigned' : 'assigned';
  const params: ListTicketsSqlParams = {
    status: input.status ?? null, customerId: input.customerId ?? null, assigneeMode,
    assigneeId: input.assignee ?? null, limit: input.limit ?? 50, offset: input.offset ?? 0,
  };
  const prepared = preparePostgresQuery(query, params, { strictParameterNames: true });
  return (await pool.query<Ticket>(placeTicketOrdering(prepared.sql, input.sort), [...prepared.values])).rows;
}
