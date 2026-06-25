import { queryMany } from '@ashiba-ts/driver-adapter-core';
import type { FeatureQueryExecutor } from '#features/_shared/featureQueryExecutor.js';
import { queryModel } from './generated/query.meta.js';
import { querySql } from './generated/query.sql.js';

export const listCustomersForTicketSql = querySql;
export const listCustomersForTicketQuery = {
  id: 'list-customers-for-ticket',
  path: 'list-customers-for-ticket.sql',
  sqlPath: 'list-customers-for-ticket.sql',
  sql: listCustomersForTicketSql,
  queryModel,
  optionalConditionCompression: true,
  metadata: {
    sqlId: 'list-customers-for-ticket',
    queryId: 'list-customers-for-ticket',
    sqlFile: 'list-customers-for-ticket.sql',
    sqlPath: 'list-customers-for-ticket.sql',
  },
} as const;

export interface ListCustomersForTicketQueryParams {
  limit: number;
}

export interface ListCustomersForTicketQueryResult {
  customer_id: string;
  name: string;
  tier: string;
  locale: string;
  created_at: string;
}

type QueryRow = ListCustomersForTicketQueryResult;

export async function executeListCustomersForTicketQuery(
  executor: FeatureQueryExecutor,
  params: ListCustomersForTicketQueryParams
): Promise<ListCustomersForTicketQueryResult[]> {
  return queryMany<QueryRow>(executor, listCustomersForTicketQuery, params as unknown as Record<string, unknown>);
}
