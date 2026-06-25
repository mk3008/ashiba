import { queryMany } from '@ashiba-ts/driver-adapter-core';
import type { FeatureQueryExecutor } from '#features/_shared/featureQueryExecutor.js';
import { queryModel } from './generated/query.meta.js';
import { querySql } from './generated/query.sql.js';

export const getTicketDetailSql = querySql;
export const getTicketDetailQuery = {
  id: 'get-ticket-detail',
  path: 'get-ticket-detail.sql',
  sqlPath: 'get-ticket-detail.sql',
  sql: getTicketDetailSql,
  queryModel,
  optionalConditionCompression: true,
  metadata: {
    sqlId: 'get-ticket-detail',
    queryId: 'get-ticket-detail',
    sqlFile: 'get-ticket-detail.sql',
    sqlPath: 'get-ticket-detail.sql',
  },
} as const;

export interface GetTicketDetailQueryParams {
  ticketId: string;
}

export interface GetTicketDetailQueryResult {
  channel: string | null;
  created_at: string | null;
  customer_name: string | null;
  customer_tier: string | null;
  language: string | null;
  message_body: string | null;
  message_created_at: string | null;
  message_id: string | null;
  priority: string | null;
  sender_name: string | null;
  sender_role: string | null;
  sla_due_at: string | null;
  status: string | null;
  subject: string | null;
  ticket_id: string | null;
  updated_at: string | null;
  version_key: number | null;
}

type QueryRow = GetTicketDetailQueryResult;

export async function executeGetTicketDetailQuery(
  executor: FeatureQueryExecutor,
  params: GetTicketDetailQueryParams
): Promise<GetTicketDetailQueryResult[]> {
  return queryMany<QueryRow>(executor, getTicketDetailQuery, params as unknown as Record<string, unknown>);
}
