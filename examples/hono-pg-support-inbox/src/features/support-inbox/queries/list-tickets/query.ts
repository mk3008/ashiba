import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { FeatureQueryExecutor } from '#features/_shared/featureQueryExecutor.js';
import { loadSqlResource } from '#features/_shared/loadSqlResource.js';
import { queryModel } from './generated/query.meta.js';

const currentDir = dirname(fileURLToPath(import.meta.url));
export const listTicketsSql = loadSqlResource(currentDir, 'list-tickets.sql');
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
  status: unknown;
  customerTier: unknown;
  slaState: unknown;
  language: unknown;
  channel: unknown;
  tag: unknown;
  keyword: unknown;
  limit: unknown;
  offset: unknown;
}

export interface ListTicketsQueryResult {
  action_required: number | null;
  channel: string | null;
  created_at: unknown;
  customer_name: string | null;
  customer_tier: string | null;
  language: string | null;
  last_customer_reply_at: unknown;
  latest_message_at: unknown;
  latest_message_body: unknown;
  latest_sender_name: unknown;
  latest_sender_role: unknown;
  priority: string | null;
  priority_rank: number | null;
  sla_due_at: unknown;
  sla_state: string | null;
  status: string | null;
  subject: string | null;
  tag_slugs: unknown;
  ticket_id: number | null;
  total_count: number | null;
  updated_at: unknown;
  vip_rank: number | null;
}

type QueryRow = ListTicketsQueryResult;

export async function executeListTicketsQuery(
  executor: FeatureQueryExecutor,
  params: ListTicketsQueryParams
): Promise<ListTicketsQueryResult[]> {
  const rows = await executor.query<QueryRow>(listTicketsQuery, params as unknown as Record<string, unknown>);
  return rows;
}
