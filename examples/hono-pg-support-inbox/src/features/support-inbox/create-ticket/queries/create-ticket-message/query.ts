import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { FeatureQueryExecutor } from '#features/_shared/featureQueryExecutor.js';
import { loadSqlResource } from '#features/_shared/loadSqlResource.js';
import { queryModel } from './generated/query.meta.js';

const currentDir = dirname(fileURLToPath(import.meta.url));
export const createTicketMessageSql = loadSqlResource(currentDir, 'create-ticket-message.sql');
export const createTicketMessageQuery = {
  id: 'create-ticket-message',
  path: 'create-ticket-message.sql',
  sqlPath: 'create-ticket-message.sql',
  sql: createTicketMessageSql,
  queryModel,
  metadata: {
    sqlId: 'create-ticket-message',
    queryId: 'create-ticket-message',
    sqlFile: 'create-ticket-message.sql',
    sqlPath: 'create-ticket-message.sql',
  },
} as const;

export interface CreateTicketMessageQueryParams {
  ticket_id: string;
  sender_name: string;
  sender_role: string;
  body: string;
  created_at: string;
}

export interface CreateTicketMessageQueryResult {
  message_id: string;
  ticket_id: string;
  sender_name: string;
  sender_role: string;
  body: string;
  created_at: unknown;
}

type QueryRow = CreateTicketMessageQueryResult;

export async function executeCreateTicketMessageQuery(
  executor: FeatureQueryExecutor,
  params: CreateTicketMessageQueryParams
): Promise<CreateTicketMessageQueryResult> {
  const rows = await executor.query<QueryRow>(createTicketMessageQuery, params as unknown as Record<string, unknown>);
  const row = (rows[0] ?? null) as QueryRow | null;
  if (row === null) {
    throw new Error('create-ticket-message query expected one row, but got 0.');
  }
  return row;
}
