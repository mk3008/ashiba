import { queryMany, type FeatureQuerySource } from '#features/_shared/featureQueryExecutor.js';
import type { FeatureQueryExecutor } from '#features/_shared/featureQueryExecutor.js';
import { bindingMetadata } from './generated/query.meta.js';
import { querySql } from './generated/query.sql.js';

export const getTicketDetailSql = querySql;
export const getTicketDetailQuery: FeatureQuerySource<GetTicketDetailQueryParams, GetTicketDetailQueryResult> = {
  id: 'get-ticket-detail',
  path: 'get-ticket-detail.sql',
  sqlPath: 'get-ticket-detail.sql',
  sql: getTicketDetailSql,
  binding: bindingMetadata.bindings.postgres,
  metadata: {
    sqlId: 'get-ticket-detail',
    queryId: 'get-ticket-detail',
    sqlFile: 'get-ticket-detail.sql',
    sqlPath: 'get-ticket-detail.sql',
  },
};

export interface GetTicketDetailQueryParams {
  ticketId: string;
}

export interface GetTicketDetailQueryResult {
  channel: string;
  created_at: string;
  customer_name: string;
  customer_tier: string;
  language: string;
  message_body: string | null;
  message_created_at: string | null;
  message_id: string | null;
  priority: string;
  sender_name: string | null;
  sender_role: string | null;
  sla_due_at: string | null;
  status: string;
  subject: string;
  ticket_id: string;
  updated_at: string;
  version_key: number;
}

export async function executeGetTicketDetailQuery(
  executor: FeatureQueryExecutor,
  params: GetTicketDetailQueryParams
): Promise<GetTicketDetailQueryResult[]> {
  return queryMany(executor, getTicketDetailQuery, params);
}
