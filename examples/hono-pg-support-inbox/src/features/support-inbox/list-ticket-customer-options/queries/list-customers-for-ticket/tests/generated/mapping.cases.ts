import type { ListCustomersForTicketQueryMappingZtdCase } from '../boundary-ztd-types.js';

// Library-owned mechanical mapper probes. Refresh with `ashiba feature tests scaffold` or `ashiba feature tests check --fix`.
// These cases use synthetic DB result SQL to prove DTO mapping, not the source SQL business logic.
const cases: readonly ListCustomersForTicketQueryMappingZtdCase[] = [
  {
    name: "db-type-mapping: maps list-customers-for-ticket DB result values into the DTO",
    beforeDb: {
      public: {
        customers: []
      }
    },
    input: {
      limit: 100
    },
    mapperProbe: {
      sql: "select\n    cast('1' as bigint) as \"customer_id\"\n    , cast('Alice' as text) as \"name\"\n    , cast('tier-1' as text) as \"tier\"\n    , cast('locale-1' as text) as \"locale\"\n    , cast('2026-01-01T00:00:00.000Z' as timestamptz) as \"created_at\"\n;"
    },
    output: [
      {
        customer_id: "1",
        name: "Alice",
        tier: "tier-1",
        locale: "locale-1",
        created_at: "2026-01-01T00:00:00.000Z"
      }
    ]
  },
  {
    name: "boundary-value-mapping: maps list-customers-for-ticket DB result values into the DTO",
    beforeDb: {
      public: {
        customers: []
      }
    },
    input: {
      limit: 100
    },
    mapperProbe: {
      sql: "select\n    cast('9223372036854775807' as bigint) as \"customer_id\"\n    , cast('name-boundary-value' as text) as \"name\"\n    , cast('tier-boundary-value' as text) as \"tier\"\n    , cast('locale-boundary-value' as text) as \"locale\"\n    , cast('2026-01-02T00:00:00.000Z' as timestamptz) as \"created_at\"\n;"
    },
    output: [
      {
        customer_id: "9223372036854775807",
        name: "name-boundary-value",
        tier: "tier-boundary-value",
        locale: "locale-boundary-value",
        created_at: "2026-01-02T00:00:00.000Z"
      }
    ]
  },
  {
    name: "negative-boundary-value-mapping: maps list-customers-for-ticket DB result values into the DTO",
    beforeDb: {
      public: {
        customers: []
      }
    },
    input: {
      limit: 100
    },
    mapperProbe: {
      sql: "select\n    cast('-9223372036854775808' as bigint) as \"customer_id\"\n    , cast('name-negative-boundary-value' as text) as \"name\"\n    , cast('tier-negative-boundary-value' as text) as \"tier\"\n    , cast('locale-negative-boundary-value' as text) as \"locale\"\n    , cast('2026-01-03T00:00:00.000Z' as timestamptz) as \"created_at\"\n;"
    },
    output: [
      {
        customer_id: "-9223372036854775808",
        name: "name-negative-boundary-value",
        tier: "tier-negative-boundary-value",
        locale: "locale-negative-boundary-value",
        created_at: "2026-01-03T00:00:00.000Z"
      }
    ]
  }
];

export default cases;
