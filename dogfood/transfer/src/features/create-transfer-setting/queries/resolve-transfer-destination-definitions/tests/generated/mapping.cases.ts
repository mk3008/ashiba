import type { ResolveTransferDestinationDefinitionsQueryMappingZtdCase } from '../boundary-ztd-types.js';

// Library-owned mechanical mapper probes for imported SQL. Refresh with `ashiba feature tests check --fix` after SQL contract changes.
// These cases cover DB/TypeScript DTO mapping with synthetic result SQL, not source SQL business behavior.
const cases: readonly ResolveTransferDestinationDefinitionsQueryMappingZtdCase[] = [
  {
    name: "db-type-mapping: maps resolve-transfer-destination-definitions imported result columns into the DTO",
    beforeDb: {
      rawsql_transfer: {
        destination_definition: []
      }
    },
    input: {
      destination_definition_names: "value"
    },
    mapperProbe: {
      sql: "select\n    cast('1' as bigint) as \"destination_definition_id\"\n    , cast('Alice' as text) as \"destination_definition_name\"\n;"
    },
    output: [
      {
        destination_definition_id: "1",
        destination_definition_name: "Alice"
      }
    ]
  }
];

export default cases;
