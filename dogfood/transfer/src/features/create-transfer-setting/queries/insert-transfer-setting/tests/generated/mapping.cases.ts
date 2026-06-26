import type { InsertTransferSettingQueryMappingZtdCase } from '../boundary-ztd-types.js';

// Library-owned mechanical mapper probes for imported SQL. Refresh with `ashiba feature tests check --fix` after SQL contract changes.
// These cases cover DB/TypeScript DTO mapping with synthetic result SQL, not source SQL business behavior.
const cases: readonly InsertTransferSettingQueryMappingZtdCase[] = [
  {
    name: "db-type-mapping: maps insert-transfer-setting imported result columns into the DTO",
    beforeDb: {
      rawsql_transfer: {
        setting: []
      }
    },
    input: {
      setting_name: "Alice",
      description: "description-1",
      source_sql_body: "source_sql_body-1",
      source_sql_hash: "source_sql_hash-1",
      source_key_definition: {
        sample: 1
      },
      source_sql_analysis_result: {
        sample: 1
      },
      search_condition_analysis_result: {
        sample: 1
      },
      source_sql_analysis_status: "active",
      source_sql_analysis_error: "source_sql_analysis_error-1",
      is_enabled: true,
      note: "note-1"
    },
    mapperProbe: {
      sql: "select\n    cast('2026-01-01T00:00:00.000Z' as timestamptz) as \"created_at\"\n    , cast('description-1' as text) as \"description\"\n    , cast(true as boolean) as \"is_enabled\"\n    , cast('note-1' as text) as \"note\"\n    , cast('{\"sample\":1}' as jsonb) as \"search_condition_analysis_result\"\n    , cast('1' as bigint) as \"setting_id\"\n    , cast('Alice' as text) as \"setting_name\"\n    , cast('{\"sample\":1}' as jsonb) as \"source_key_definition\"\n    , cast('source_sql_analysis_error-1' as text) as \"source_sql_analysis_error\"\n    , cast('{\"sample\":1}' as jsonb) as \"source_sql_analysis_result\"\n    , cast('active' as text) as \"source_sql_analysis_status\"\n    , cast('source_sql_body-1' as text) as \"source_sql_body\"\n    , cast('source_sql_hash-1' as text) as \"source_sql_hash\"\n    , cast('2026-01-01T00:00:00.000Z' as timestamptz) as \"updated_at\"\n;"
    },
    output: [
      {
        created_at: "2026-01-01T00:00:00.000Z",
        description: "description-1",
        is_enabled: true,
        note: "note-1",
        search_condition_analysis_result: {
          sample: 1
        },
        setting_id: "1",
        setting_name: "Alice",
        source_key_definition: {
          sample: 1
        },
        source_sql_analysis_error: "source_sql_analysis_error-1",
        source_sql_analysis_result: {
          sample: 1
        },
        source_sql_analysis_status: "active",
        source_sql_body: "source_sql_body-1",
        source_sql_hash: "source_sql_hash-1",
        updated_at: "2026-01-01T00:00:00.000Z"
      }
    ]
  },
  {
    name: "nullable-output-mapping: maps insert-transfer-setting nullable imported result columns into the DTO",
    beforeDb: {
      rawsql_transfer: {
        setting: []
      }
    },
    input: {
      setting_name: "Alice",
      description: "description-1",
      source_sql_body: "source_sql_body-1",
      source_sql_hash: "source_sql_hash-1",
      source_key_definition: {
        sample: 1
      },
      source_sql_analysis_result: {
        sample: 1
      },
      search_condition_analysis_result: {
        sample: 1
      },
      source_sql_analysis_status: "active",
      source_sql_analysis_error: "source_sql_analysis_error-1",
      is_enabled: true,
      note: "note-1"
    },
    mapperProbe: {
      sql: "select\n    cast('2026-01-01T00:00:00.000Z' as timestamptz) as \"created_at\"\n    , cast(null as text) as \"description\"\n    , cast(true as boolean) as \"is_enabled\"\n    , cast(null as text) as \"note\"\n    , cast(null as jsonb) as \"search_condition_analysis_result\"\n    , cast('1' as bigint) as \"setting_id\"\n    , cast('Alice' as text) as \"setting_name\"\n    , cast('{\"sample\":1}' as jsonb) as \"source_key_definition\"\n    , cast(null as text) as \"source_sql_analysis_error\"\n    , cast(null as jsonb) as \"source_sql_analysis_result\"\n    , cast('active' as text) as \"source_sql_analysis_status\"\n    , cast('source_sql_body-1' as text) as \"source_sql_body\"\n    , cast('source_sql_hash-1' as text) as \"source_sql_hash\"\n    , cast('2026-01-01T00:00:00.000Z' as timestamptz) as \"updated_at\"\n;"
    },
    output: [
      {
        created_at: "2026-01-01T00:00:00.000Z",
        description: null,
        is_enabled: true,
        note: null,
        search_condition_analysis_result: null,
        setting_id: "1",
        setting_name: "Alice",
        source_key_definition: {
          sample: 1
        },
        source_sql_analysis_error: null,
        source_sql_analysis_result: null,
        source_sql_analysis_status: "active",
        source_sql_body: "source_sql_body-1",
        source_sql_hash: "source_sql_hash-1",
        updated_at: "2026-01-01T00:00:00.000Z"
      }
    ]
  }
];

export default cases;
