import type { InsertTransferSettingDestinationDefinitionQueryMappingZtdCase } from '../boundary-ztd-types.js';

// Library-owned mechanical mapper probes for imported SQL. Refresh with `ashiba feature tests check --fix` after SQL contract changes.
// These cases cover DB/TypeScript DTO mapping with synthetic result SQL, not source SQL business behavior.
const cases: readonly InsertTransferSettingDestinationDefinitionQueryMappingZtdCase[] = [
  {
    name: "db-type-mapping: maps insert-transfer-setting-destination-definition imported result columns into the DTO",
    beforeDb: {
      rawsql_transfer: {
        destination_link: []
      }
    },
    input: {
      setting_id: "1",
      destination_definition_id: "1",
      destination_link_name: "Alice",
      execution_order: 1,
      destination_key_mapping: {
        sample: 1
      },
      mapping_definition: {
        sample: 1
      },
      diff_compare_excluded_columns: {
        sample: 1
      },
      is_enabled: true,
      note: "note-1"
    },
    mapperProbe: {
      sql: "select\n    cast('2026-01-01T00:00:00.000Z' as timestamptz) as \"created_at\"\n    , cast('1' as bigint) as \"destination_definition_id\"\n    , cast('{\"sample\":1}' as jsonb) as \"destination_key_mapping\"\n    , cast('1' as bigint) as \"destination_link_id\"\n    , cast('{\"sample\":1}' as jsonb) as \"diff_compare_excluded_columns\"\n    , cast(1 as integer) as \"execution_order\"\n    , cast('generated_delete_transfer_sql_body-1' as text) as \"generated_delete_transfer_sql_body\"\n    , cast('generated_insert_transfer_sql_body-1' as text) as \"generated_insert_transfer_sql_body\"\n    , cast('generated_sql_error-1' as text) as \"generated_sql_error\"\n    , cast('active' as text) as \"generated_sql_status\"\n    , cast('generated_update_transfer_sql_body-1' as text) as \"generated_update_transfer_sql_body\"\n    , cast(true as boolean) as \"is_enabled\"\n    , cast('{\"sample\":1}' as jsonb) as \"mapping_definition\"\n    , cast('note-1' as text) as \"note\"\n    , cast('1' as bigint) as \"setting_id\"\n    , cast('2026-01-01T00:00:00.000Z' as timestamptz) as \"updated_at\"\n;"
    },
    output: [
      {
        created_at: "2026-01-01T00:00:00.000Z",
        destination_definition_id: "1",
        destination_key_mapping: {
          sample: 1
        },
        destination_link_id: "1",
        diff_compare_excluded_columns: {
          sample: 1
        },
        execution_order: 1,
        generated_delete_transfer_sql_body: "generated_delete_transfer_sql_body-1",
        generated_insert_transfer_sql_body: "generated_insert_transfer_sql_body-1",
        generated_sql_error: "generated_sql_error-1",
        generated_sql_status: "active",
        generated_update_transfer_sql_body: "generated_update_transfer_sql_body-1",
        is_enabled: true,
        mapping_definition: {
          sample: 1
        },
        note: "note-1",
        setting_id: "1",
        updated_at: "2026-01-01T00:00:00.000Z"
      }
    ]
  },
  {
    name: "nullable-output-mapping: maps insert-transfer-setting-destination-definition nullable imported result columns into the DTO",
    beforeDb: {
      rawsql_transfer: {
        destination_link: []
      }
    },
    input: {
      setting_id: "1",
      destination_definition_id: "1",
      destination_link_name: "Alice",
      execution_order: 1,
      destination_key_mapping: {
        sample: 1
      },
      mapping_definition: {
        sample: 1
      },
      diff_compare_excluded_columns: {
        sample: 1
      },
      is_enabled: true,
      note: "note-1"
    },
    mapperProbe: {
      sql: "select\n    cast('2026-01-01T00:00:00.000Z' as timestamptz) as \"created_at\"\n    , cast('1' as bigint) as \"destination_definition_id\"\n    , cast('{\"sample\":1}' as jsonb) as \"destination_key_mapping\"\n    , cast('1' as bigint) as \"destination_link_id\"\n    , cast(null as jsonb) as \"diff_compare_excluded_columns\"\n    , cast(1 as integer) as \"execution_order\"\n    , cast('generated_delete_transfer_sql_body-1' as text) as \"generated_delete_transfer_sql_body\"\n    , cast('generated_insert_transfer_sql_body-1' as text) as \"generated_insert_transfer_sql_body\"\n    , cast(null as text) as \"generated_sql_error\"\n    , cast('active' as text) as \"generated_sql_status\"\n    , cast('generated_update_transfer_sql_body-1' as text) as \"generated_update_transfer_sql_body\"\n    , cast(true as boolean) as \"is_enabled\"\n    , cast('{\"sample\":1}' as jsonb) as \"mapping_definition\"\n    , cast(null as text) as \"note\"\n    , cast('1' as bigint) as \"setting_id\"\n    , cast('2026-01-01T00:00:00.000Z' as timestamptz) as \"updated_at\"\n;"
    },
    output: [
      {
        created_at: "2026-01-01T00:00:00.000Z",
        destination_definition_id: "1",
        destination_key_mapping: {
          sample: 1
        },
        destination_link_id: "1",
        diff_compare_excluded_columns: null,
        execution_order: 1,
        generated_delete_transfer_sql_body: "generated_delete_transfer_sql_body-1",
        generated_insert_transfer_sql_body: "generated_insert_transfer_sql_body-1",
        generated_sql_error: null,
        generated_sql_status: "active",
        generated_update_transfer_sql_body: "generated_update_transfer_sql_body-1",
        is_enabled: true,
        mapping_definition: {
          sample: 1
        },
        note: null,
        setting_id: "1",
        updated_at: "2026-01-01T00:00:00.000Z"
      }
    ]
  }
];

export default cases;
