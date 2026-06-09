import type { CreateTicketQueryMappingZtdCase } from '../boundary-ztd-types.js';

// Library-owned mechanical mapper probes. Refresh with `ashiba feature tests scaffold` or `ashiba feature tests check --fix`.
// These cases use synthetic DB result SQL to prove DTO mapping, not the source SQL business logic.
const cases: readonly CreateTicketQueryMappingZtdCase[] = [
  {
    name: "db-type-mapping: maps create-ticket DB result values into the DTO",
    beforeDb: {
      public: {
        tickets: []
      }
    },
    input: {
      customer_id: "1",
      subject: "subject-1",
      status: "active",
      priority: "priority-1",
      language: "language-1",
      channel: "channel-1",
      sla_due_at: "2026-01-01T00:00:00.000Z",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z"
    },
    mapperProbe: {
      sql: "select\n    cast('1' as bigint) as \"ticket_id\"\n    , cast('1' as bigint) as \"customer_id\"\n    , cast('subject-1' as text) as \"subject\"\n    , cast('active' as text) as \"status\"\n    , cast('priority-1' as text) as \"priority\"\n    , cast('language-1' as text) as \"language\"\n    , cast('channel-1' as text) as \"channel\"\n    , cast('2026-01-01T00:00:00.000Z' as timestamptz) as \"sla_due_at\"\n    , cast('2026-01-01T00:00:00.000Z' as timestamptz) as \"created_at\"\n    , cast('2026-01-01T00:00:00.000Z' as timestamptz) as \"updated_at\"\n    , cast(1 as integer) as \"version_key\"\n    , cast('{\"sample\":1}' as jsonb) as \"metadata\"\n;"
    },
    output: {
      ticket_id: "1",
      customer_id: "1",
      subject: "subject-1",
      status: "active",
      priority: "priority-1",
      language: "language-1",
      channel: "channel-1",
      sla_due_at: "2026-01-01T00:00:00.000Z",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      version_key: 1,
      metadata: {
        sample: 1
      }
    }
  },
  {
    name: "nullable-output-mapping: maps create-ticket DB result values into the DTO",
    beforeDb: {
      public: {
        tickets: []
      }
    },
    input: {
      customer_id: "1",
      subject: "subject-1",
      status: "active",
      priority: "priority-1",
      language: "language-1",
      channel: "channel-1",
      sla_due_at: "2026-01-01T00:00:00.000Z",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z"
    },
    mapperProbe: {
      sql: "select\n    cast('1' as bigint) as \"ticket_id\"\n    , cast('1' as bigint) as \"customer_id\"\n    , cast('subject-1' as text) as \"subject\"\n    , cast('active' as text) as \"status\"\n    , cast('priority-1' as text) as \"priority\"\n    , cast('language-1' as text) as \"language\"\n    , cast('channel-1' as text) as \"channel\"\n    , cast(null as timestamptz) as \"sla_due_at\"\n    , cast('2026-01-01T00:00:00.000Z' as timestamptz) as \"created_at\"\n    , cast('2026-01-01T00:00:00.000Z' as timestamptz) as \"updated_at\"\n    , cast(1 as integer) as \"version_key\"\n    , cast('{\"sample\":1}' as jsonb) as \"metadata\"\n;"
    },
    output: {
      ticket_id: "1",
      customer_id: "1",
      subject: "subject-1",
      status: "active",
      priority: "priority-1",
      language: "language-1",
      channel: "channel-1",
      sla_due_at: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      version_key: 1,
      metadata: {
        sample: 1
      }
    }
  },
  {
    name: "boundary-value-mapping: maps create-ticket DB result values into the DTO",
    beforeDb: {
      public: {
        tickets: []
      }
    },
    input: {
      customer_id: "1",
      subject: "subject-1",
      status: "active",
      priority: "priority-1",
      language: "language-1",
      channel: "channel-1",
      sla_due_at: "2026-01-01T00:00:00.000Z",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z"
    },
    mapperProbe: {
      sql: "select\n    cast('9223372036854775807' as bigint) as \"ticket_id\"\n    , cast('9223372036854775807' as bigint) as \"customer_id\"\n    , cast('subject-boundary-value' as text) as \"subject\"\n    , cast('status-boundary-value' as text) as \"status\"\n    , cast('priority-boundary-value' as text) as \"priority\"\n    , cast('language-boundary-value' as text) as \"language\"\n    , cast('channel-boundary-value' as text) as \"channel\"\n    , cast('2026-01-02T00:00:00.000Z' as timestamptz) as \"sla_due_at\"\n    , cast('2026-01-02T00:00:00.000Z' as timestamptz) as \"created_at\"\n    , cast('2026-01-02T00:00:00.000Z' as timestamptz) as \"updated_at\"\n    , cast(2147483647 as integer) as \"version_key\"\n    , cast('{\"case\":\"boundary\"}' as jsonb) as \"metadata\"\n;"
    },
    output: {
      ticket_id: "9223372036854775807",
      customer_id: "9223372036854775807",
      subject: "subject-boundary-value",
      status: "status-boundary-value",
      priority: "priority-boundary-value",
      language: "language-boundary-value",
      channel: "channel-boundary-value",
      sla_due_at: "2026-01-02T00:00:00.000Z",
      created_at: "2026-01-02T00:00:00.000Z",
      updated_at: "2026-01-02T00:00:00.000Z",
      version_key: 2147483647,
      metadata: {
        case: "boundary"
      }
    }
  },
  {
    name: "negative-boundary-value-mapping: maps create-ticket DB result values into the DTO",
    beforeDb: {
      public: {
        tickets: []
      }
    },
    input: {
      customer_id: "1",
      subject: "subject-1",
      status: "active",
      priority: "priority-1",
      language: "language-1",
      channel: "channel-1",
      sla_due_at: "2026-01-01T00:00:00.000Z",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z"
    },
    mapperProbe: {
      sql: "select\n    cast('-9223372036854775808' as bigint) as \"ticket_id\"\n    , cast('-9223372036854775808' as bigint) as \"customer_id\"\n    , cast('subject-negative-boundary-value' as text) as \"subject\"\n    , cast('status-negative-boundary-value' as text) as \"status\"\n    , cast('priority-negative-boundary-value' as text) as \"priority\"\n    , cast('language-negative-boundary-value' as text) as \"language\"\n    , cast('channel-negative-boundary-value' as text) as \"channel\"\n    , cast('2026-01-03T00:00:00.000Z' as timestamptz) as \"sla_due_at\"\n    , cast('2026-01-03T00:00:00.000Z' as timestamptz) as \"created_at\"\n    , cast('2026-01-03T00:00:00.000Z' as timestamptz) as \"updated_at\"\n    , cast(-2147483648 as integer) as \"version_key\"\n    , cast('{\"case\":\"negative-boundary\"}' as jsonb) as \"metadata\"\n;"
    },
    output: {
      ticket_id: "-9223372036854775808",
      customer_id: "-9223372036854775808",
      subject: "subject-negative-boundary-value",
      status: "status-negative-boundary-value",
      priority: "priority-negative-boundary-value",
      language: "language-negative-boundary-value",
      channel: "channel-negative-boundary-value",
      sla_due_at: "2026-01-03T00:00:00.000Z",
      created_at: "2026-01-03T00:00:00.000Z",
      updated_at: "2026-01-03T00:00:00.000Z",
      version_key: -2147483648,
      metadata: {
        case: "negative-boundary"
      }
    }
  }
];

export default cases;
