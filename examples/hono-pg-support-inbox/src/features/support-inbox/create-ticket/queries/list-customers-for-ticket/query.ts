import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { FeatureQueryExecutor } from '#features/_shared/featureQueryExecutor.js';
import { loadSqlResource } from '#features/_shared/loadSqlResource.js';
import { queryModel } from './generated/query.meta.js';

const currentDir = dirname(fileURLToPath(import.meta.url));
export const listCustomersForTicketSql = loadSqlResource(currentDir, 'list-customers-for-ticket.sql');
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
  const rows = await executor.query<QueryRow>(listCustomersForTicketQuery, params as unknown as Record<string, unknown>);
  const row = rows as QueryRow[];
  return row;
}
