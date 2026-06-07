import type { Pool } from 'pg';

import { createPgSqlClient } from '#adapters/pg/pool.js';
import { executeGetTicketDetailQuery, type GetTicketDetailQueryResult } from '#features/support-inbox/queries/get-ticket-detail/query.js';
import { executeListTicketsQuery, type ListTicketsQueryResult } from '#features/support-inbox/queries/list-tickets/query.js';
import type { TicketFilters } from '../request/tickets.request.js';
import { toListTicketsParams, toTicketSort } from '../request/tickets.request.js';

export type TicketDetail = {
  summary?: GetTicketDetailQueryResult;
  messages: GetTicketDetailQueryResult[];
};

export type SupportInboxViewModel = {
  tickets: ListTicketsQueryResult[];
  selectedTicket?: TicketDetail;
  inspection: SqlInspection;
  pagination: Pagination;
};

export type Pagination = {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
};

export type SqlInspection = {
  sqlPath: string;
  selectedSort: string;
  safeSortKeys: string;
  stableOrder: string;
  orderedNames: readonly string[];
  boundParams: readonly BoundParam[];
  compiledSql: string;
  rowCount: number;
  elapsedMs?: number;
};

export type BoundParam = {
  placeholder: string;
  name: string;
  value: unknown;
};

type SqlInspectionEvent = {
  phase: 'start' | 'end' | 'error';
  compiledSql?: string;
  orderedNames?: readonly string[];
  params?: readonly unknown[];
  elapsedMs?: number;
  rowCount?: number;
};

export async function loadSupportInbox(pool: Pool, filters: TicketFilters): Promise<SupportInboxViewModel> {
  const listEvents: SqlInspectionEvent[] = [];
  const listExecutor = createPgSqlClient(pool, {
    includeUnmaskedParamsInEvents: true,
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
    pagination: buildPagination(filters, tickets),
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
    safeSortKeys:
      toTicketSort(filters)
        .map((item) => `${item.key} ${item.direction ?? 'asc'}`)
        .join(', ') || 'なし',
    stableOrder: 'ticket_id asc',
    orderedNames: executed?.orderedNames ?? [],
    boundParams: buildBoundParams(executed?.orderedNames ?? [], executed?.params ?? []),
    compiledSql: executed?.compiledSql ?? '',
    rowCount: executed?.rowCount ?? rowCount,
    elapsedMs: executed?.elapsedMs,
  };
}

function buildBoundParams(orderedNames: readonly string[], params: readonly unknown[]): BoundParam[] {
  return orderedNames.map((name, index) => ({
    placeholder: `$${index + 1}`,
    name,
    value: params[index],
  }));
}

function buildPagination(filters: TicketFilters, tickets: readonly ListTicketsQueryResult[]): Pagination {
  const pageSize = 10;
  const totalCount = Number(tickets[0]?.total_count ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  return {
    page: filters.page,
    pageSize,
    totalCount,
    totalPages,
    hasPrevious: filters.page > 1,
    hasNext: filters.page < totalPages,
  };
}
