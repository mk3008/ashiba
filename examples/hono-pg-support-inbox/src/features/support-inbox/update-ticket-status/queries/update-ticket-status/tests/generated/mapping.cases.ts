import type { UpdateTicketStatusQueryMappingZtdCase } from '../boundary-ztd-types.js';

// Library-owned mechanical mapper probes for imported SQL. Refresh with `ashiba feature tests check --fix` after SQL contract changes.
// These cases cover DB/TypeScript DTO mapping with synthetic result SQL, not source SQL business behavior.
const cases: readonly UpdateTicketStatusQueryMappingZtdCase[] = [
  {
    name: "db-type-mapping: maps update-ticket-status imported result columns into the DTO",
    beforeDb: {
      public: {
        tickets: []
      }
    },
    input: {
      status: "active",
      updated_at: "2026-01-01T00:00:00.000Z",
      ticket_id: "1",
      expected_version_key: 1
    },
    mapperProbe: {
      sql: "select\n    cast('active' as text) as \"status\"\n    , cast('1' as bigint) as \"ticket_id\"\n    , cast('2026-01-01T00:00:00.000Z' as timestamptz) as \"updated_at\"\n    , cast(1 as integer) as \"version_key\"\n;"
    },
    output: [
      {
        status: "active",
        ticket_id: "1",
        updated_at: "2026-01-01T00:00:00.000Z",
        version_key: 1
      }
    ]
  }
];

export default cases;
