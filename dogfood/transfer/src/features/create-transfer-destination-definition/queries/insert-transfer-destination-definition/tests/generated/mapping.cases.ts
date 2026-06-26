import type { InsertTransferDestinationDefinitionQueryMappingZtdCase } from '../boundary-ztd-types.js';

// Library-owned mechanical mapper probes for imported SQL. Refresh with `ashiba feature tests check --fix` after SQL contract changes.
// These cases cover DB/TypeScript DTO mapping with synthetic result SQL, not source SQL business behavior.
const cases: readonly InsertTransferDestinationDefinitionQueryMappingZtdCase[] = [
  {
    name: "db-type-mapping: maps insert-transfer-destination-definition imported result columns into the DTO",
    beforeDb: {
      rawsql_transfer: {
        destination_definition: []
      }
    },
    input: {
      destination_definition_name: "Alice",
      description: "description-1",
      destination_table_name: "Alice",
      destination_columns: {
        sample: 1
      },
      destination_key_columns: [
        "destination_key_columns-1"
      ],
      sequence_expression_definition: {
        sample: 1
      },
      transfer_model: "transfer_model-1",
      sign_inversion_columns: [
        "sign_inversion_columns-1"
      ],
      note: "note-1"
    },
    mapperProbe: {
      sql: "select\n    cast('2026-01-01T00:00:00.000Z' as timestamptz) as \"created_at\"\n    , cast('description-1' as text) as \"description\"\n    , cast('{\"sample\":1}' as jsonb) as \"destination_columns\"\n    , cast('1' as bigint) as \"destination_definition_id\"\n    , cast('Alice' as text) as \"destination_definition_name\"\n    , cast(array['destination_key_columns-1'] as text[]) as \"destination_key_columns\"\n    , cast('Alice' as text) as \"destination_table_name\"\n    , cast('generated_red_transfer_sql_body-1' as text) as \"generated_red_transfer_sql_body\"\n    , cast('generated_red_transfer_sql_error-1' as text) as \"generated_red_transfer_sql_error\"\n    , cast('active' as text) as \"generated_red_transfer_sql_status\"\n    , cast('note-1' as text) as \"note\"\n    , cast('{\"sample\":1}' as jsonb) as \"sequence_expression_definition\"\n    , cast(array['sign_inversion_columns-1'] as text[]) as \"sign_inversion_columns\"\n    , cast('transfer_model-1' as text) as \"transfer_model\"\n    , cast('2026-01-01T00:00:00.000Z' as timestamptz) as \"updated_at\"\n;"
    },
    output: [
      {
        created_at: "2026-01-01T00:00:00.000Z",
        description: "description-1",
        destination_columns: {
          sample: 1
        },
        destination_definition_id: "1",
        destination_definition_name: "Alice",
        destination_key_columns: [
          "destination_key_columns-1"
        ],
        destination_table_name: "Alice",
        generated_red_transfer_sql_body: "generated_red_transfer_sql_body-1",
        generated_red_transfer_sql_error: "generated_red_transfer_sql_error-1",
        generated_red_transfer_sql_status: "active",
        note: "note-1",
        sequence_expression_definition: {
          sample: 1
        },
        sign_inversion_columns: [
          "sign_inversion_columns-1"
        ],
        transfer_model: "transfer_model-1",
        updated_at: "2026-01-01T00:00:00.000Z"
      }
    ]
  },
  {
    name: "nullable-output-mapping: maps insert-transfer-destination-definition nullable imported result columns into the DTO",
    beforeDb: {
      rawsql_transfer: {
        destination_definition: []
      }
    },
    input: {
      destination_definition_name: "Alice",
      description: "description-1",
      destination_table_name: "Alice",
      destination_columns: {
        sample: 1
      },
      destination_key_columns: [
        "destination_key_columns-1"
      ],
      sequence_expression_definition: {
        sample: 1
      },
      transfer_model: "transfer_model-1",
      sign_inversion_columns: [
        "sign_inversion_columns-1"
      ],
      note: "note-1"
    },
    mapperProbe: {
      sql: "select\n    cast('2026-01-01T00:00:00.000Z' as timestamptz) as \"created_at\"\n    , cast(null as text) as \"description\"\n    , cast('{\"sample\":1}' as jsonb) as \"destination_columns\"\n    , cast('1' as bigint) as \"destination_definition_id\"\n    , cast('Alice' as text) as \"destination_definition_name\"\n    , cast(array['destination_key_columns-1'] as text[]) as \"destination_key_columns\"\n    , cast('Alice' as text) as \"destination_table_name\"\n    , cast('generated_red_transfer_sql_body-1' as text) as \"generated_red_transfer_sql_body\"\n    , cast(null as text) as \"generated_red_transfer_sql_error\"\n    , cast('active' as text) as \"generated_red_transfer_sql_status\"\n    , cast(null as text) as \"note\"\n    , cast(null as jsonb) as \"sequence_expression_definition\"\n    , cast(null as text[]) as \"sign_inversion_columns\"\n    , cast('transfer_model-1' as text) as \"transfer_model\"\n    , cast('2026-01-01T00:00:00.000Z' as timestamptz) as \"updated_at\"\n;"
    },
    output: [
      {
        created_at: "2026-01-01T00:00:00.000Z",
        description: null,
        destination_columns: {
          sample: 1
        },
        destination_definition_id: "1",
        destination_definition_name: "Alice",
        destination_key_columns: [
          "destination_key_columns-1"
        ],
        destination_table_name: "Alice",
        generated_red_transfer_sql_body: "generated_red_transfer_sql_body-1",
        generated_red_transfer_sql_error: null,
        generated_red_transfer_sql_status: "active",
        note: null,
        sequence_expression_definition: null,
        sign_inversion_columns: null,
        transfer_model: "transfer_model-1",
        updated_at: "2026-01-01T00:00:00.000Z"
      }
    ]
  }
];

export default cases;
