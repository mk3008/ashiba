import { queryOne, type FeatureQueryExecutor } from '#features/_shared/featureQueryExecutor.js';
import { queryModel } from './generated/query.meta.js';
import { querySql } from './generated/query.sql.js';

export const createTicketMessageSql = querySql;
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
  created_at: string;
}

type QueryRow = CreateTicketMessageQueryResult;

export async function executeCreateTicketMessageQuery(
  executor: FeatureQueryExecutor,
  params: CreateTicketMessageQueryParams
): Promise<CreateTicketMessageQueryResult> {
  return queryOne<QueryRow>(executor, createTicketMessageQuery, params as unknown as Record<string, unknown>);
}
