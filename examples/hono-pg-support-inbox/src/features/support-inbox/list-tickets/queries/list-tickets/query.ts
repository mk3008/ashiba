import { queryMany, type FeatureQuerySource } from '#features/_shared/featureQueryExecutor.js';
import type { FeatureQueryExecutor } from '#features/_shared/featureQueryExecutor.js';
import { bindingMetadata } from './generated/query.meta.js';
import { querySql } from './generated/query.sql.js';

export const listTicketsSql = querySql;
export const listTicketsQuery: FeatureQuerySource<ListTicketsQueryParams, ListTicketsQueryResult> = {
  id: 'list-tickets',
  path: 'list-tickets.sql',
  sqlPath: 'list-tickets.sql',
  sql: listTicketsSql,
  binding: bindingMetadata.bindings.postgres,
  metadata: {
    sqlId: 'list-tickets',
    queryId: 'list-tickets',
    sqlFile: 'list-tickets.sql',
    sqlPath: 'list-tickets.sql',
  },
};

export interface ListTicketsQueryParams {
  tag: string | null;
  status: string | null;
  customerTier: string | null;
  slaState: string | null;
  language: string | null;
  channel: string | null;
  keyword: unknown;
  limit: number;
  offset: number;
  sort_1: string | null;
  sort_2: string | null;
  sort_3: string | null;
  sort_4: string | null;
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
  total_count: string;
  updated_at: string | null;
  vip_rank: number | null;
}

export async function executeListTicketsQuery(
  executor: FeatureQueryExecutor,
  params: ListTicketsQueryParams
): Promise<ListTicketsQueryResult[]> {
  return queryMany(executor, listTicketsQuery, params);
}
