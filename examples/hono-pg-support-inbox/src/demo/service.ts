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
  inspection: SqlInspection;
};

export type SqlInspection = {
  sqlPath: string;
  selectedSort: string;
  safeSortKeys: string;
  stableOrder: string;
  orderedNames: readonly string[];
  compiledSql: string;
  rowCount: number;
  elapsedMs?: number;
};

type SqlInspectionEvent = {
  phase: 'start' | 'end' | 'error';
  compiledSql?: string;
  orderedNames?: readonly string[];
  elapsedMs?: number;
  rowCount?: number;
};

export async function loadSupportInbox(pool: Pool, filters: TicketFilters): Promise<SupportInboxViewModel> {
  const listEvents: SqlInspectionEvent[] = [];
  const listExecutor = createPgSqlClient(pool, {
    observer: {
      emit(event) {
        listEvents.push(event);
      },
    },
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
    inspection: buildSqlInspection(filters, tickets.length, listEvents),
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

function buildSqlInspection(filters: TicketFilters, rowCount: number, events: readonly SqlInspectionEvent[]): SqlInspection {
  const executed = [...events].reverse().find((event) => event.phase === 'end' || event.phase === 'start');
  return {
    sqlPath: 'src/features/support-inbox/queries/list-tickets/list-tickets.sql',
    selectedSort: filters.sort,
    safeSortKeys: toTicketSort(filters)
      .map((item) => `${item.key} ${item.direction ?? 'asc'}`)
      .join(', '),
    stableOrder: 'ticket_id asc',
    orderedNames: executed?.orderedNames ?? [],
    compiledSql: executed?.compiledSql ?? '',
    rowCount: executed?.rowCount ?? rowCount,
    elapsedMs: executed?.elapsedMs,
  };
}
