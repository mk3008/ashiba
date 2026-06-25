import { queryMany } from '@ashiba-ts/driver-adapter-core';
import type { FeatureQueryExecutor } from '#features/_shared/featureQueryExecutor.js';
import { queryModel } from './generated/query.meta.js';
import { querySql } from './generated/query.sql.js';

export const listTicketsSql = querySql;
export const listTicketsQuery = {
  id: 'list-tickets',
  path: 'list-tickets.sql',
  sqlPath: 'list-tickets.sql',
  sql: listTicketsSql,
  queryModel,
  optionalConditionCompression: true,
  metadata: {
    sqlId: 'list-tickets',
    queryId: 'list-tickets',
    sqlFile: 'list-tickets.sql',
    sqlPath: 'list-tickets.sql',
  },
} as const;

export interface ListTicketsQueryParams {
  tag: unknown;
  status: unknown;
  customerTier: unknown;
  slaState: unknown;
  language: unknown;
  channel: unknown;
  keyword: unknown;
  limit: unknown;
  offset: unknown;
}

export interface ListTicketsQueryResult {
  action_required: number | null;
  channel: string | null;
  created_at: string | null;
  customer_name: string | null;
  customer_tier: string | null;
  language: string | null;
  last_customer_reply_at: string | null;
  latest_message_at: string | null;
  latest_message_body: string | null;
  latest_sender_name: string | null;
  latest_sender_role: string | null;
  priority: string | null;
  priority_rank: number | null;
  sla_due_at: string | null;
  sla_state: string | null;
  status: string | null;
  subject: string | null;
  tag_slugs: string[] | null;
  ticket_id: string | null;
  total_count: number | null;
  updated_at: string | null;
  vip_rank: number | null;
}

type QueryRow = ListTicketsQueryResult;

export async function executeListTicketsQuery(
  executor: FeatureQueryExecutor,
  params: ListTicketsQueryParams
): Promise<ListTicketsQueryResult[]> {
  return queryMany<QueryRow>(executor, listTicketsQuery, params as unknown as Record<string, unknown>);
}
