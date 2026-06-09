import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { FeatureQueryExecutor } from '#features/_shared/featureQueryExecutor.js';
import { loadSqlResource } from '#features/_shared/loadSqlResource.js';
import { queryModel } from './generated/query.meta.js';

const currentDir = dirname(fileURLToPath(import.meta.url));
export const updateTicketStatusSql = loadSqlResource(currentDir, 'update-ticket-status.sql');
export const updateTicketStatusQuery = {
  id: 'update-ticket-status',
  path: 'update-ticket-status.sql',
  sqlPath: 'update-ticket-status.sql',
  sql: updateTicketStatusSql,
  queryModel,
  metadata: {
    sqlId: 'update-ticket-status',
    queryId: 'update-ticket-status',
    sqlFile: 'update-ticket-status.sql',
    sqlPath: 'update-ticket-status.sql',
  },
} as const;

export interface UpdateTicketStatusQueryParams {
  status: string;
  updated_at: string;
  ticket_id: string;
  expected_version_key: number;
}

export interface UpdateTicketStatusQueryResult {
  status: string | null;
  ticket_id: number | null;
  updated_at: unknown;
  version_key: number | null;
}

type QueryRow = UpdateTicketStatusQueryResult;

export async function executeUpdateTicketStatusQuery(
  executor: FeatureQueryExecutor,
  params: UpdateTicketStatusQueryParams
): Promise<UpdateTicketStatusQueryResult[]> {
  const rows = await executor.query<QueryRow>(updateTicketStatusQuery, params as unknown as Record<string, unknown>);
  return rows;
}
