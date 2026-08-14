import { queryOne, type FeatureQuerySource } from '@ashiba-ts/driver-adapter-core';
import type { FeatureQueryExecutor } from '#features/_shared/featureQueryExecutor.js';
import { queryModel } from './generated/query.meta.js';
import { querySql } from './generated/query.sql.js';

export const createTicketSql = querySql;
export const createTicketQuery: FeatureQuerySource<CreateTicketQueryParams, CreateTicketQueryResult> = {
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
};

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
  sla_due_at: string | null;
  created_at: string;
  updated_at: string;
  version_key: number;
  metadata: unknown;
}

export async function executeCreateTicketQuery(
  executor: FeatureQueryExecutor,
  params: CreateTicketQueryParams
): Promise<CreateTicketQueryResult> {
  return queryOne(executor, createTicketQuery, params);
}
