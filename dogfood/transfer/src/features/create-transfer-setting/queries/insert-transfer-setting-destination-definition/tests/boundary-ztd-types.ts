import type { QuerySpecZtdCase } from '#tests/support/ztd/case-types.js';
import type { InsertTransferSettingDestinationDefinitionQueryParams, InsertTransferSettingDestinationDefinitionQueryResult } from '../query.js';

export type InsertTransferSettingDestinationDefinitionBeforeDb = {
  rawsql_transfer: {
    destination_link: readonly {
      destination_link_id?: unknown;
      setting_id?: unknown;
      destination_definition_id?: unknown;
      destination_link_name?: unknown;
      execution_order?: unknown;
      destination_key_mapping?: unknown;
      mapping_definition?: unknown;
      diff_compare_excluded_columns?: unknown;
      generated_insert_transfer_sql_body?: unknown;
      generated_update_transfer_sql_body?: unknown;
      generated_delete_transfer_sql_body?: unknown;
      generated_sql_status?: unknown;
      generated_sql_error?: unknown;
      is_enabled?: unknown;
      created_at?: unknown;
      updated_at?: unknown;
      note?: unknown;
    }[];
  };
};

export type InsertTransferSettingDestinationDefinitionQueryBoundaryZtdCase = QuerySpecZtdCase<
  InsertTransferSettingDestinationDefinitionBeforeDb,
  InsertTransferSettingDestinationDefinitionQueryParams,
  InsertTransferSettingDestinationDefinitionQueryResult[]
>;

export type InsertTransferSettingDestinationDefinitionQueryMappingZtdCase = QuerySpecZtdCase<
  InsertTransferSettingDestinationDefinitionBeforeDb,
  InsertTransferSettingDestinationDefinitionQueryParams,
  InsertTransferSettingDestinationDefinitionQueryResult[]
>;

// Result columns are mapped through synthetic DB result probes so mapper tests stay focused on DTO compatibility.
