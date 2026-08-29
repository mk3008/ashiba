import { queryMany, type FeatureQuerySource } from '#features/_shared/featureQueryExecutor.js';
import type { FeatureQueryExecutor } from '#features/_shared/featureQueryExecutor.js';
import { queryModel } from './generated/query.meta.js';
import { querySql } from './generated/query.sql.js';

export const insertTransferDestinationDefinitionSql = querySql;
export const insertTransferDestinationDefinitionQuery: FeatureQuerySource<InsertTransferDestinationDefinitionQueryParams, InsertTransferDestinationDefinitionQueryResult> = {
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
};

export interface InsertTransferDestinationDefinitionQueryParams {
  destination_definition_name: unknown;
  description: unknown;
  destination_table_name: unknown;
  destination_columns: unknown;
  destination_key_columns: string[];
  sequence_expression_definition: unknown;
  transfer_model: unknown;
  sign_inversion_columns: string[];
  note: unknown;
}

export interface InsertTransferDestinationDefinitionQueryResult {
  created_at: string;
  description: string | null;
  destination_columns: unknown;
  destination_definition_id: string;
  destination_definition_name: string;
  destination_key_columns: string[];
  destination_table_name: string;
  generated_red_transfer_sql_body: string;
  generated_red_transfer_sql_error: string | null;
  generated_red_transfer_sql_status: string;
  note: string | null;
  sequence_expression_definition: unknown;
  sign_inversion_columns: string[] | null;
  transfer_model: string;
  updated_at: string;
}

export async function executeInsertTransferDestinationDefinitionQuery(
  executor: FeatureQueryExecutor,
  params: InsertTransferDestinationDefinitionQueryParams
): Promise<InsertTransferDestinationDefinitionQueryResult[]> {
  return queryMany(executor, insertTransferDestinationDefinitionQuery, params);
}
