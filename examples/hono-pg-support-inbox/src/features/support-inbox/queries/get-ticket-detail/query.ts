import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { FeatureQueryExecutor } from '#features/_shared/featureQueryExecutor.js';
import { loadSqlResource } from '#features/_shared/loadSqlResource.js';
import { queryModel } from './generated/query.meta.js';

const currentDir = dirname(fileURLToPath(import.meta.url));
export const getTicketDetailSql = loadSqlResource(currentDir, 'get-ticket-detail.sql');
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
  created_at: unknown;
  customer_name: string | null;
  customer_tier: string | null;
  language: string | null;
  message_body: string | null;
  message_created_at: unknown;
  message_id: number | null;
  priority: string | null;
  sender_name: string | null;
  sender_role: string | null;
  sla_due_at: unknown;
  status: string | null;
  subject: string | null;
  ticket_id: number | null;
  updated_at: unknown;
}

type QueryRow = GetTicketDetailQueryResult;

export async function executeGetTicketDetailQuery(
  executor: FeatureQueryExecutor,
  params: GetTicketDetailQueryParams
): Promise<GetTicketDetailQueryResult[]> {
  const rows = await executor.query<QueryRow>(getTicketDetailQuery, params as unknown as Record<string, unknown>);
  return rows;
}
