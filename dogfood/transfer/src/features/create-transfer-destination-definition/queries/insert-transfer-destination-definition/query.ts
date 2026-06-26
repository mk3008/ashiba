import { queryMany } from '@ashiba-ts/driver-adapter-core';
import type { FeatureQueryExecutor } from '#features/_shared/featureQueryExecutor.js';
import { queryModel } from './generated/query.meta.js';
import { querySql } from './generated/query.sql.js';

export const insertTransferDestinationDefinitionSql = querySql;
export const insertTransferDestinationDefinitionQuery = {
  id: 'insert-transfer-destination-definition',
  path: 'insert-transfer-destination-definition.sql',
  sqlPath: 'insert-transfer-destination-definition.sql',
  sql: insertTransferDestinationDefinitionSql,
  queryModel,
  metadata: {
    sqlId: 'insert-transfer-destination-definition',
    queryId: 'insert-transfer-destination-definition',
    sqlFile: 'insert-transfer-destination-definition.sql',
    sqlPath: 'insert-transfer-destination-definition.sql',
  },
} as const;

export interface InsertTransferDestinationDefinitionQueryParams {
  destination_definition_name: unknown;
  description: unknown;
  destination_table_name: unknown;
  destination_columns: unknown;
  destination_key_columns: unknown;
  sequence_expression_definition: unknown;
  transfer_model: unknown;
  sign_inversion_columns: unknown;
  note: unknown;
}

export interface InsertTransferDestinationDefinitionQueryResult {
  created_at: string | null;
  description: string | null;
  destination_columns: unknown;
  destination_definition_id: string | null;
  destination_definition_name: string | null;
  destination_key_columns: string[] | null;
  destination_table_name: string | null;
  generated_red_transfer_sql_body: string | null;
  generated_red_transfer_sql_error: string | null;
  generated_red_transfer_sql_status: string | null;
  note: string | null;
  sequence_expression_definition: unknown;
  sign_inversion_columns: string[] | null;
  transfer_model: string | null;
  updated_at: string | null;
}

type QueryRow = InsertTransferDestinationDefinitionQueryResult;

export async function executeInsertTransferDestinationDefinitionQuery(
  executor: FeatureQueryExecutor,
  params: InsertTransferDestinationDefinitionQueryParams
): Promise<InsertTransferDestinationDefinitionQueryResult[]> {
  return queryMany<QueryRow>(executor, insertTransferDestinationDefinitionQuery, params as unknown as Record<string, unknown>);
}
