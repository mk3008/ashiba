import { queryMany, type FeatureQuerySource } from '@ashiba-ts/driver-adapter-core';
import type { FeatureQueryExecutor } from '#features/_shared/featureQueryExecutor.js';
import { queryModel } from './generated/query.meta.js';
import { querySql } from './generated/query.sql.js';

export const updateTicketStatusSql = querySql;
export const updateTicketStatusQuery: FeatureQuerySource<UpdateTicketStatusQueryParams, UpdateTicketStatusQueryResult> = {
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
};

export interface UpdateTicketStatusQueryParams {
  status: string;
  updated_at: string;
  ticket_id: string;
  expected_version_key: number;
}

export interface UpdateTicketStatusQueryResult {
  status: string;
  ticket_id: string;
  updated_at: string;
  version_key: number;
}

export async function executeUpdateTicketStatusQuery(
  executor: FeatureQueryExecutor,
  params: UpdateTicketStatusQueryParams
): Promise<UpdateTicketStatusQueryResult[]> {
  return queryMany(executor, updateTicketStatusQuery, params);
}
