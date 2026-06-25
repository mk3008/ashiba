import { queryMany } from '@ashiba-ts/driver-adapter-core';
import type { FeatureQueryExecutor } from '#features/_shared/featureQueryExecutor.js';
import { queryModel } from './generated/query.meta.js';
import { querySql } from './generated/query.sql.js';

export const updateTicketStatusSql = querySql;
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
  ticket_id: string | null;
  updated_at: string | null;
  version_key: number | null;
}

type QueryRow = UpdateTicketStatusQueryResult;

export async function executeUpdateTicketStatusQuery(
  executor: FeatureQueryExecutor,
  params: UpdateTicketStatusQueryParams
): Promise<UpdateTicketStatusQueryResult[]> {
  return queryMany<QueryRow>(executor, updateTicketStatusQuery, params as unknown as Record<string, unknown>);
}
