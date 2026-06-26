import type { QuerySpecZtdCase } from '#tests/support/ztd/case-types.js';
import type { InsertTransferDestinationDefinitionQueryParams, InsertTransferDestinationDefinitionQueryResult } from '../query.js';

export type InsertTransferDestinationDefinitionBeforeDb = {
  rawsql_transfer: {
    destination_definition: readonly {
      destination_definition_id?: unknown;
      destination_definition_name?: unknown;
      description?: unknown;
      destination_table_name?: unknown;
      destination_columns?: unknown;
      destination_key_columns?: unknown;
      sequence_expression_definition?: unknown;
      transfer_model?: unknown;
      sign_inversion_columns?: unknown;
      date_lower_bound_adjustments?: unknown;
      generated_red_transfer_sql_body?: unknown;
      generated_red_transfer_sql_status?: unknown;
      generated_red_transfer_sql_error?: unknown;
      created_at?: unknown;
      updated_at?: unknown;
      note?: unknown;
    }[];
  };
};

export type InsertTransferDestinationDefinitionQueryBoundaryZtdCase = QuerySpecZtdCase<
  InsertTransferDestinationDefinitionBeforeDb,
  InsertTransferDestinationDefinitionQueryParams,
  InsertTransferDestinationDefinitionQueryResult[]
>;

export type InsertTransferDestinationDefinitionQueryMappingZtdCase = QuerySpecZtdCase<
  InsertTransferDestinationDefinitionBeforeDb,
  InsertTransferDestinationDefinitionQueryParams,
  unknown
>;

// Result columns are mapped through synthetic DB result probes so mapper tests stay focused on DTO compatibility.
