import { queryMany, type FeatureQuerySource } from '@ashiba-ts/driver-adapter-core';
import type { FeatureQueryExecutor } from '#features/_shared/featureQueryExecutor.js';
import { queryModel } from './generated/query.meta.js';
import { querySql } from './generated/query.sql.js';

export const insertTransferSettingDestinationDefinitionSql = querySql;
export const insertTransferSettingDestinationDefinitionQuery: FeatureQuerySource<InsertTransferSettingDestinationDefinitionQueryParams, InsertTransferSettingDestinationDefinitionQueryResult> = {
  id: 'insert-transfer-setting-destination-definition',
  path: 'insert-transfer-setting-destination-definition.sql',
  sqlPath: 'insert-transfer-setting-destination-definition.sql',
  sql: insertTransferSettingDestinationDefinitionSql,
  queryModel,
  metadata: {
    sqlId: 'insert-transfer-setting-destination-definition',
    queryId: 'insert-transfer-setting-destination-definition',
    sqlFile: 'insert-transfer-setting-destination-definition.sql',
    sqlPath: 'insert-transfer-setting-destination-definition.sql',
  },
};

export interface InsertTransferSettingDestinationDefinitionQueryParams {
  setting_id: string;
  destination_definition_id: string;
  destination_link_name: string;
  execution_order: number;
  destination_key_mapping: unknown;
  mapping_definition: unknown;
  diff_compare_excluded_columns: unknown;
  is_enabled: boolean;
  note: string | null;
}

export interface InsertTransferSettingDestinationDefinitionQueryResult {
  created_at: string;
  destination_definition_id: string;
  destination_key_mapping: unknown;
  destination_link_id: string;
  diff_compare_excluded_columns: unknown;
  execution_order: number;
  generated_delete_transfer_sql_body: string;
  generated_insert_transfer_sql_body: string;
  generated_sql_error: string | null;
  generated_sql_status: string;
  generated_update_transfer_sql_body: string;
  is_enabled: boolean;
  mapping_definition: unknown;
  note: string | null;
  setting_id: string;
  updated_at: string;
}

export async function executeInsertTransferSettingDestinationDefinitionQuery(
  executor: FeatureQueryExecutor,
  params: InsertTransferSettingDestinationDefinitionQueryParams
): Promise<InsertTransferSettingDestinationDefinitionQueryResult[]> {
  return queryMany(executor, insertTransferSettingDestinationDefinitionQuery, params);
}
