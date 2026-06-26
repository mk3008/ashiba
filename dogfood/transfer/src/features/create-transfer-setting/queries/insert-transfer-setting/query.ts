import { queryMany } from '@ashiba-ts/driver-adapter-core';
import type { FeatureQueryExecutor } from '#features/_shared/featureQueryExecutor.js';
import { queryModel } from './generated/query.meta.js';
import { querySql } from './generated/query.sql.js';

export const insertTransferSettingSql = querySql;
export const insertTransferSettingQuery = {
  id: 'insert-transfer-setting',
  path: 'insert-transfer-setting.sql',
  sqlPath: 'insert-transfer-setting.sql',
  sql: insertTransferSettingSql,
  queryModel,
  metadata: {
    sqlId: 'insert-transfer-setting',
    queryId: 'insert-transfer-setting',
    sqlFile: 'insert-transfer-setting.sql',
    sqlPath: 'insert-transfer-setting.sql',
  },
} as const;

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
  created_at: string | null;
  description: string | null;
  is_enabled: boolean | null;
  note: string | null;
  search_condition_analysis_result: unknown;
  setting_id: string | null;
  setting_name: string | null;
  source_key_definition: unknown;
  source_sql_analysis_error: string | null;
  source_sql_analysis_result: unknown;
  source_sql_analysis_status: string | null;
  source_sql_body: string | null;
  source_sql_hash: string | null;
  updated_at: string | null;
}

type QueryRow = InsertTransferSettingQueryResult;

export async function executeInsertTransferSettingQuery(
  executor: FeatureQueryExecutor,
  params: InsertTransferSettingQueryParams
): Promise<InsertTransferSettingQueryResult[]> {
  return queryMany<QueryRow>(executor, insertTransferSettingQuery, params as unknown as Record<string, unknown>);
}
