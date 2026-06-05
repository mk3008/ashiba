import type { Pool } from 'pg';

import { createPgSqlClient } from '#adapters/pg/pool.js';
import { executeGetTicketDetailQuery, type GetTicketDetailQueryResult } from '#features/support-inbox/queries/get-ticket-detail/query.js';
import { executeListTicketsQuery, type ListTicketsQueryResult } from '#features/support-inbox/queries/list-tickets/query.js';
import type { TicketFilters } from './request.js';
import { toListTicketsParams, toTicketSort } from './request.js';

export type TicketDetail = {
  summary?: GetTicketDetailQueryResult;
  messages: GetTicketDetailQueryResult[];
};

export type SupportInboxViewModel = {
  tickets: ListTicketsQueryResult[];
  selectedTicket?: TicketDetail;
};

export async function loadSupportInbox(pool: Pool, filters: TicketFilters): Promise<SupportInboxViewModel> {
  const listExecutor = createPgSqlClient(pool, {
    executeOptions: {
      sort: toTicketSort(filters),
    },
  });
  const tickets = await executeListTicketsQuery(listExecutor, toListTicketsParams(filters));
  const selectedTicketId = filters.selectedTicketId ?? tickets[0]?.ticket_id?.toString();
  const selectedTicket = selectedTicketId ? await loadTicketDetail(pool, selectedTicketId) : undefined;
  return {
    tickets,
    selectedTicket,
  };
}

async function loadTicketDetail(pool: Pool, ticketId: string): Promise<TicketDetail> {
  const executor = createPgSqlClient(pool);
  const messages = await executeGetTicketDetailQuery(executor, { ticketId });
  return {
    summary: messages[0],
    messages,
  };
}
