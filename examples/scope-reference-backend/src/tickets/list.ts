import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Pool } from 'pg';
import { prepareNamedSql } from '../sql.js';
import { placeTicketOrdering, type SortInput } from './ordering.js';
import type { ListTicketsSqlParams, Ticket } from './types.js';

const source = readFileSync(fileURLToPath(new URL('./list.sql', import.meta.url)), 'utf8');
export type AssigneeFilter = undefined | null | string;
export type ListTicketsInput = { status?: string; customerId?: string; assignee?: AssigneeFilter; limit?: number; offset?: number; sort?: SortInput[] };

export async function listTickets(pool: Pool, input: ListTicketsInput = {}): Promise<Ticket[]> {
  const assigneeMode = input.assignee === undefined ? 'any' : input.assignee === null ? 'unassigned' : 'assigned';
  const ordered = placeTicketOrdering(source, input.sort);
  const params: ListTicketsSqlParams = {
    status: input.status ?? null, customerId: input.customerId ?? null, assigneeMode,
    assigneeId: input.assignee ?? null, limit: input.limit ?? 50, offset: input.offset ?? 0,
  };
  const prepared = prepareNamedSql(ordered, params);
  return (await pool.query<Ticket>(prepared.sql, prepared.values)).rows;
}
