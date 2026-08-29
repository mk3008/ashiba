import { queryMany, type FeatureQuerySource } from '#features/_shared/featureQueryExecutor.js';
import type { FeatureQueryExecutor } from '#features/_shared/featureQueryExecutor.js';
import { bindingMetadata } from './generated/query.meta.js';
import { querySql } from './generated/query.sql.js';

export const insertTransferSettingSql = querySql;
export const insertTransferSettingQuery: FeatureQuerySource<InsertTransferSettingQueryParams, InsertTransferSettingQueryResult> = {
  id: 'insert-transfer-setting',
  path: 'insert-transfer-setting.sql',
  sqlPath: 'insert-transfer-setting.sql',
  sql: insertTransferSettingSql,
  binding: bindingMetadata.bindings.postgres,
  metadata: {
    sqlId: 'insert-transfer-setting',
    queryId: 'insert-transfer-setting',
    sqlFile: 'insert-transfer-setting.sql',
    sqlPath: 'insert-transfer-setting.sql',
  },
};

export interface InsertTransferSettingQueryParams {
  setting_name: string;
  description: string | null;
  source_sql_body: string;
  source_sql_hash: string;
  source_key_definition: unknown;
  source_sql_analysis_result: unknown;
  search_condition_analysis_result: unknown;
  source_sql_analysis_status: string;
  source_sql_analysis_error: string | null;
  is_enabled: boolean;
  note: string | null;
}

export interface InsertTransferSettingQueryResult {
  created_at: string;
  description: string | null;
  is_enabled: boolean;
  note: string | null;
  search_condition_analysis_result: unknown;
  setting_id: string;
  setting_name: string;
  source_key_definition: unknown;
  source_sql_analysis_error: string | null;
  source_sql_analysis_result: unknown;
  source_sql_analysis_status: string;
  source_sql_body: string;
  source_sql_hash: string;
  updated_at: string;
}

export async function executeInsertTransferSettingQuery(
  executor: FeatureQueryExecutor,
  params: InsertTransferSettingQueryParams
): Promise<InsertTransferSettingQueryResult[]> {
  return queryMany(executor, insertTransferSettingQuery, params);
}
