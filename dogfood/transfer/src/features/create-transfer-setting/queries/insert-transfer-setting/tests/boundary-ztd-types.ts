import type { QuerySpecZtdCase } from '#tests/support/ztd/case-types.js';
import type { InsertTransferSettingQueryParams, InsertTransferSettingQueryResult } from '../query.js';

export type InsertTransferSettingBeforeDb = {
  rawsql_transfer: {
    setting: readonly {
      setting_id?: unknown;
      setting_name?: unknown;
      description?: unknown;
      source_sql_body?: unknown;
      source_sql_hash?: unknown;
      source_key_definition?: unknown;
      source_sql_analysis_result?: unknown;
      search_condition_analysis_result?: unknown;
      source_sql_analysis_status?: unknown;
      source_sql_analysis_error?: unknown;
      is_enabled?: unknown;
      created_at?: unknown;
      updated_at?: unknown;
      note?: unknown;
    }[];
  };
};

export type InsertTransferSettingQueryBoundaryZtdCase = QuerySpecZtdCase<
  InsertTransferSettingBeforeDb,
  InsertTransferSettingQueryParams,
  InsertTransferSettingQueryResult[]
>;

export type InsertTransferSettingQueryMappingZtdCase = QuerySpecZtdCase<
  InsertTransferSettingBeforeDb,
  InsertTransferSettingQueryParams,
  InsertTransferSettingQueryResult[]
>;

// Result columns are mapped through synthetic DB result probes so mapper tests stay focused on DTO compatibility.
