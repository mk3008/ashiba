import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { FeatureQueryExecutor } from '#features/_shared/featureQueryExecutor.js';
import { loadSqlResource } from '#features/_shared/loadSqlResource.js';
import { queryModel } from './generated/query.meta.js';

const currentDir = dirname(fileURLToPath(import.meta.url));
export const createTicketSql = loadSqlResource(currentDir, 'create-ticket.sql');
export const createTicketQuery = {
  id: 'create-ticket',
  path: 'create-ticket.sql',
  sqlPath: 'create-ticket.sql',
  sql: createTicketSql,
  queryModel,
  metadata: {
    sqlId: 'create-ticket',
    queryId: 'create-ticket',
    sqlFile: 'create-ticket.sql',
    sqlPath: 'create-ticket.sql',
  },
} as const;

export interface CreateTicketQueryParams {
  customer_id: string;
  subject: string;
  status: string;
  priority: string;
  language: string;
  channel: string;
  sla_due_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTicketQueryResult {
  ticket_id: string;
  customer_id: string;
  subject: string;
  status: string;
  priority: string;
  language: string;
  channel: string;
  sla_due_at: unknown;
  created_at: unknown;
  updated_at: unknown;
  version_key: number;
  metadata: unknown;
}

type QueryRow = CreateTicketQueryResult;

export async function executeCreateTicketQuery(
  executor: FeatureQueryExecutor,
  params: CreateTicketQueryParams
): Promise<CreateTicketQueryResult> {
  const rows = await executor.query<QueryRow>(createTicketQuery, params as unknown as Record<string, unknown>);
  const row = (rows[0] ?? null) as QueryRow | null;
  if (row === null) {
    throw new Error('create-ticket query expected one row, but got 0.');
  }
  return row;
}
