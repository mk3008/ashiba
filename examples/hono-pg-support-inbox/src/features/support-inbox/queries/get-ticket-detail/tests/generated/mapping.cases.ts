import type { GetTicketDetailQueryMappingZtdCase } from '../boundary-ztd-types.js';

// Library-owned mechanical mapper probes for imported SQL. Refresh with `ashiba feature tests check --fix` after SQL contract changes.
// These cases cover DB/TypeScript DTO mapping with synthetic result SQL, not source SQL business behavior.
const cases: readonly GetTicketDetailQueryMappingZtdCase[] = [
  {
    name: "db-type-mapping: maps get-ticket-detail imported result columns into the DTO",
    beforeDb: {
      public: {
        tickets: []
      }
    },
    input: {
      ticketId: "value"
    },
    mapperProbe: {
      sql: "select\n    cast('channel-1' as text) as \"channel\"\n    , cast('2026-01-01T00:00:00.000Z' as timestamptz) as \"created_at\"\n    , cast('value' as text) as \"customer_name\"\n    , cast('value' as text) as \"customer_tier\"\n    , cast('language-1' as text) as \"language\"\n    , cast('value' as text) as \"message_body\"\n    , cast('value' as text) as \"message_created_at\"\n    , cast(1 as integer) as \"message_id\"\n    , cast('priority-1' as text) as \"priority\"\n    , cast('value' as text) as \"sender_name\"\n    , cast('value' as text) as \"sender_role\"\n    , cast('2026-01-01T00:00:00.000Z' as timestamptz) as \"sla_due_at\"\n    , cast('active' as text) as \"status\"\n    , cast('subject-1' as text) as \"subject\"\n    , cast(1 as bigint) as \"ticket_id\"\n    , cast('2026-01-01T00:00:00.000Z' as timestamptz) as \"updated_at\"\n;"
    },
    output: [
      {
        channel: "channel-1",
        created_at: "2026-01-01T00:00:00.000Z",
        customer_name: "value",
        customer_tier: "value",
        language: "language-1",
        message_body: "value",
        message_created_at: "value",
        message_id: 1,
        priority: "priority-1",
        sender_name: "value",
        sender_role: "value",
        sla_due_at: "2026-01-01T00:00:00.000Z",
        status: "active",
        subject: "subject-1",
        ticket_id: 1,
        updated_at: "2026-01-01T00:00:00.000Z"
      }
    ]
  },
  {
    name: "nullable-output-mapping: maps get-ticket-detail nullable imported result columns into the DTO",
    beforeDb: {
      public: {
        tickets: []
      }
    },
    input: {
      ticketId: "value"
    },
    mapperProbe: {
      sql: "select\n    cast('channel-1' as text) as \"channel\"\n    , cast('2026-01-01T00:00:00.000Z' as timestamptz) as \"created_at\"\n    , cast('value' as text) as \"customer_name\"\n    , cast('value' as text) as \"customer_tier\"\n    , cast('language-1' as text) as \"language\"\n    , cast('value' as text) as \"message_body\"\n    , cast('value' as text) as \"message_created_at\"\n    , cast(1 as integer) as \"message_id\"\n    , cast('priority-1' as text) as \"priority\"\n    , cast('value' as text) as \"sender_name\"\n    , cast('value' as text) as \"sender_role\"\n    , cast(null as timestamptz) as \"sla_due_at\"\n    , cast('active' as text) as \"status\"\n    , cast('subject-1' as text) as \"subject\"\n    , cast(1 as bigint) as \"ticket_id\"\n    , cast('2026-01-01T00:00:00.000Z' as timestamptz) as \"updated_at\"\n;"
    },
    output: [
      {
        channel: "channel-1",
        created_at: "2026-01-01T00:00:00.000Z",
        customer_name: "value",
        customer_tier: "value",
        language: "language-1",
        message_body: "value",
        message_created_at: "value",
        message_id: 1,
        priority: "priority-1",
        sender_name: "value",
        sender_role: "value",
        sla_due_at: null,
        status: "active",
        subject: "subject-1",
        ticket_id: 1,
        updated_at: "2026-01-01T00:00:00.000Z"
      }
    ]
  }
];

export default cases;
