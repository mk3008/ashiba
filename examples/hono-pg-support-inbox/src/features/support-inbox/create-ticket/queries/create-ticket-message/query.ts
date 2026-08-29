import { queryOne, type FeatureQuerySource } from '#features/_shared/featureQueryExecutor.js';
import type { FeatureQueryExecutor } from '#features/_shared/featureQueryExecutor.js';
import { bindingMetadata } from './generated/query.meta.js';
import { querySql } from './generated/query.sql.js';

export const createTicketMessageSql = querySql;
export const createTicketMessageQuery: FeatureQuerySource<CreateTicketMessageQueryParams, CreateTicketMessageQueryResult> = {
  id: 'create-ticket-message',
  path: 'create-ticket-message.sql',
  sqlPath: 'create-ticket-message.sql',
  sql: createTicketMessageSql,
  binding: bindingMetadata.bindings.postgres,
  metadata: {
    sqlId: 'create-ticket-message',
    queryId: 'create-ticket-message',
    sqlFile: 'create-ticket-message.sql',
    sqlPath: 'create-ticket-message.sql',
  },
};

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

export async function executeCreateTicketMessageQuery(
  executor: FeatureQueryExecutor,
  params: CreateTicketMessageQueryParams
): Promise<CreateTicketMessageQueryResult> {
  return queryOne(executor, createTicketMessageQuery, params);
}
