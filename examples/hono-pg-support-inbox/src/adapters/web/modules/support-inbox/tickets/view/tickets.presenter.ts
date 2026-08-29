import type { Pool } from 'pg';

import { createPgSqlClient } from '#adapters/pg/pool.js';
import { executeGetTicketDetailQuery, type GetTicketDetailQueryResult } from '#features/support-inbox/list-tickets/queries/get-ticket-detail/query.js';
import { executeListTicketsQuery, type ListTicketsQueryResult } from '#features/support-inbox/list-tickets/queries/list-tickets/query.js';
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
  apiRoute: string;
  selectedSort: string;
  reviewedSortKeys: string;
  stableOrder: string;
  parameterNames: readonly string[];
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
  executionId?: string;
  compiledSql?: string;
  parameterNames?: readonly string[];
  params?: readonly unknown[];
  elapsedMs?: number;
  rowCount?: number;
};

export type SupportInboxRequestContext = {
  requestId: string;
  apiMethod: string;
  apiPath: string;
  apiRoute: string;
  operation: string;
};

export async function loadSupportInbox(pool: Pool, filters: TicketFilters, context: SupportInboxRequestContext): Promise<SupportInboxViewModel> {
  const listEvents: SqlInspectionEvent[] = [];
  const listExecutor = createPgSqlClient(pool, {
    includeUnmaskedParamsInEvents: true,
    observer: {
      emit(event) {
        listEvents.push(event);
      },
    },
    metadata: toSqlMetadata(context, filters, 'list'),
  });
  const tickets = await executeListTicketsQuery(listExecutor, toListTicketsParams(filters));
  const selectedTicketId = filters.selectedTicketId ?? tickets[0]?.ticket_id?.toString();
  const selectedTicket = selectedTicketId ? await loadTicketDetail(pool, selectedTicketId, context) : undefined;
  return {
    tickets,
    selectedTicket,
    inspection: buildSqlInspection(filters, tickets.length, listEvents, context),
    pagination: buildPagination(filters, tickets),
  };
}

async function loadTicketDetail(pool: Pool, ticketId: string, context: SupportInboxRequestContext): Promise<TicketDetail> {
  const executor = createPgSqlClient(pool, {
    metadata: toSqlMetadata(context, undefined, 'detail'),
  });
  const messages = await executeGetTicketDetailQuery(executor, { ticketId });
  return {
    summary: messages[0],
    messages,
  };
}

function buildSqlInspection(filters: TicketFilters, rowCount: number, events: readonly SqlInspectionEvent[], context: SupportInboxRequestContext): SqlInspection {
  const executed = [...events].reverse().find((event) => event.phase === 'end' || event.phase === 'start');
  return {
    sqlPath: 'src/features/support-inbox/list-tickets/queries/list-tickets/list-tickets.sql',
    apiRoute: context.apiRoute,
    selectedSort: filters.sort,
    reviewedSortKeys:
      toTicketSort(filters)
        .map((item) => `${item.key} ${item.direction ?? 'asc'}`)
        .join(', ') || 'なし',
    stableOrder: 'ticket_id asc',
    parameterNames: executed?.parameterNames ?? [],
    boundParams: buildBoundParams(executed?.parameterNames ?? [], executed?.params ?? []),
    compiledSql: executed?.compiledSql ?? '',
    rowCount: executed?.rowCount ?? rowCount,
    elapsedMs: executed?.elapsedMs,
  };
}

function toSqlMetadata(context: SupportInboxRequestContext, filters?: TicketFilters, queryVariant?: string) {
  return {
    requestId: context.requestId,
    apiMethod: context.apiMethod,
    apiPath: context.apiPath,
    apiRoute: context.apiRoute,
    operation: context.operation,
    filterKeys: filters ? activeFilterKeys(filters) : [],
    sortKeys: filters ? toTicketSort(filters).map((item) => `${item.key}.${item.direction ?? 'asc'}`) : [],
    queryVariant,
  };
}

function activeFilterKeys(filters: TicketFilters): string[] {
  return (['status', 'customerTier', 'slaState', 'language', 'channel', 'tag', 'keyword'] as const)
    .filter((key) => filters[key] !== '');
}

function buildBoundParams(parameterNames: readonly string[], params: readonly unknown[]): BoundParam[] {
  return parameterNames.map((name, index) => ({
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
