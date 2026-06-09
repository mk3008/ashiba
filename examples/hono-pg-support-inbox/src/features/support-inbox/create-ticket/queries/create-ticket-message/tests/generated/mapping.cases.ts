import type { CreateTicketMessageQueryMappingZtdCase } from '../boundary-ztd-types.js';

// Library-owned mechanical mapper probes. Refresh with `ashiba feature tests scaffold` or `ashiba feature tests check --fix`.
// These cases use synthetic DB result SQL to prove DTO mapping, not the source SQL business logic.
const cases: readonly CreateTicketMessageQueryMappingZtdCase[] = [
  {
    name: "db-type-mapping: maps create-ticket-message DB result values into the DTO",
    beforeDb: {
      public: {
        ticket_messages: []
      }
    },
    input: {
      ticket_id: "1",
      sender_name: "Alice",
      sender_role: "sender_role-1",
      body: "body-1",
      created_at: "2026-01-01T00:00:00.000Z"
    },
    mapperProbe: {
      sql: "select\n    cast('1' as bigint) as \"message_id\"\n    , cast('1' as bigint) as \"ticket_id\"\n    , cast('Alice' as text) as \"sender_name\"\n    , cast('sender_role-1' as text) as \"sender_role\"\n    , cast('body-1' as text) as \"body\"\n    , cast('2026-01-01T00:00:00.000Z' as timestamptz) as \"created_at\"\n;"
    },
    output: {
      message_id: "1",
      ticket_id: "1",
      sender_name: "Alice",
      sender_role: "sender_role-1",
      body: "body-1",
      created_at: "2026-01-01T00:00:00.000Z"
    }
  },
  {
    name: "boundary-value-mapping: maps create-ticket-message DB result values into the DTO",
    beforeDb: {
      public: {
        ticket_messages: []
      }
    },
    input: {
      ticket_id: "1",
      sender_name: "Alice",
      sender_role: "sender_role-1",
      body: "body-1",
      created_at: "2026-01-01T00:00:00.000Z"
    },
    mapperProbe: {
      sql: "select\n    cast('9223372036854775807' as bigint) as \"message_id\"\n    , cast('9223372036854775807' as bigint) as \"ticket_id\"\n    , cast('sender_name-boundary-value' as text) as \"sender_name\"\n    , cast('sender_role-boundary-value' as text) as \"sender_role\"\n    , cast('body-boundary-value' as text) as \"body\"\n    , cast('2026-01-02T00:00:00.000Z' as timestamptz) as \"created_at\"\n;"
    },
    output: {
      message_id: "9223372036854775807",
      ticket_id: "9223372036854775807",
      sender_name: "sender_name-boundary-value",
      sender_role: "sender_role-boundary-value",
      body: "body-boundary-value",
      created_at: "2026-01-02T00:00:00.000Z"
    }
  },
  {
    name: "negative-boundary-value-mapping: maps create-ticket-message DB result values into the DTO",
    beforeDb: {
      public: {
        ticket_messages: []
      }
    },
    input: {
      ticket_id: "1",
      sender_name: "Alice",
      sender_role: "sender_role-1",
      body: "body-1",
      created_at: "2026-01-01T00:00:00.000Z"
    },
    mapperProbe: {
      sql: "select\n    cast('-9223372036854775808' as bigint) as \"message_id\"\n    , cast('-9223372036854775808' as bigint) as \"ticket_id\"\n    , cast('sender_name-negative-boundary-value' as text) as \"sender_name\"\n    , cast('sender_role-negative-boundary-value' as text) as \"sender_role\"\n    , cast('body-negative-boundary-value' as text) as \"body\"\n    , cast('2026-01-03T00:00:00.000Z' as timestamptz) as \"created_at\"\n;"
    },
    output: {
      message_id: "-9223372036854775808",
      ticket_id: "-9223372036854775808",
      sender_name: "sender_name-negative-boundary-value",
      sender_role: "sender_role-negative-boundary-value",
      body: "body-negative-boundary-value",
      created_at: "2026-01-03T00:00:00.000Z"
    }
  }
];

export default cases;
