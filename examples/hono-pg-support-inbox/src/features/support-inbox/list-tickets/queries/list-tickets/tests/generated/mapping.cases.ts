import type { ListTicketsQueryMappingZtdCase } from '../boundary-ztd-types.js';

// Library-owned mechanical mapper probes for imported SQL. Refresh with `ashiba feature tests check --fix` after SQL contract changes.
// These cases cover DB/TypeScript DTO mapping with synthetic result SQL, not source SQL business behavior.
const cases: readonly ListTicketsQueryMappingZtdCase[] = [
  {
    name: "db-type-mapping: maps list-tickets imported result columns into the DTO",
    beforeDb: {
      public: {
        tickets: []
      }
    },
    input: {
      tag: "value",
      status: "active",
      customerTier: "value",
      slaState: "value",
      language: "language-1",
      channel: "channel-1",
      keyword: "value",
      limit: 100,
      offset: 0
    },
    mapperProbe: {
      sql: "select\n    cast(1 as integer) as \"action_required\"\n    , cast('channel-1' as text) as \"channel\"\n    , cast('2026-01-01T00:00:00.000Z' as timestamptz) as \"created_at\"\n    , cast('value' as text) as \"customer_name\"\n    , cast('value' as text) as \"customer_tier\"\n    , cast('language-1' as text) as \"language\"\n    , cast('value' as text) as \"last_customer_reply_at\"\n    , cast('value' as text) as \"latest_message_at\"\n    , cast('value' as text) as \"latest_message_body\"\n    , cast('value' as text) as \"latest_sender_name\"\n    , cast('value' as text) as \"latest_sender_role\"\n    , cast('priority-1' as text) as \"priority\"\n    , cast(1 as integer) as \"priority_rank\"\n    , cast('2026-01-01T00:00:00.000Z' as timestamptz) as \"sla_due_at\"\n    , cast('value' as text) as \"sla_state\"\n    , cast('active' as text) as \"status\"\n    , cast('subject-1' as text) as \"subject\"\n    , cast(array['value'] as text[]) as \"tag_slugs\"\n    , cast('1' as bigint) as \"ticket_id\"\n    , cast('value' as text) as \"total_count\"\n    , cast('2026-01-01T00:00:00.000Z' as timestamptz) as \"updated_at\"\n    , cast(1 as integer) as \"vip_rank\"\n;"
    },
    output: [
      {
        action_required: 1,
        channel: "channel-1",
        created_at: "2026-01-01T00:00:00.000Z",
        customer_name: "value",
        customer_tier: "value",
        language: "language-1",
        last_customer_reply_at: "value",
        latest_message_at: "value",
        latest_message_body: "value",
        latest_sender_name: "value",
        latest_sender_role: "value",
        priority: "priority-1",
        priority_rank: 1,
        sla_due_at: "2026-01-01T00:00:00.000Z",
        sla_state: "value",
        status: "active",
        subject: "subject-1",
        tag_slugs: [
          "value"
        ],
        ticket_id: "1",
        total_count: "value",
        updated_at: "2026-01-01T00:00:00.000Z",
        vip_rank: 1
      }
    ]
  },
  {
    name: "nullable-output-mapping: maps list-tickets nullable imported result columns into the DTO",
    beforeDb: {
      public: {
        tickets: []
      }
    },
    input: {
      tag: "value",
      status: "active",
      customerTier: "value",
      slaState: "value",
      language: "language-1",
      channel: "channel-1",
      keyword: "value",
      limit: 100,
      offset: 0
    },
    mapperProbe: {
      sql: "select\n    cast(null as integer) as \"action_required\"\n    , cast(null as text) as \"channel\"\n    , cast(null as timestamptz) as \"created_at\"\n    , cast(null as text) as \"customer_name\"\n    , cast(null as text) as \"customer_tier\"\n    , cast(null as text) as \"language\"\n    , cast(null as text) as \"last_customer_reply_at\"\n    , cast(null as text) as \"latest_message_at\"\n    , cast(null as text) as \"latest_message_body\"\n    , cast(null as text) as \"latest_sender_name\"\n    , cast(null as text) as \"latest_sender_role\"\n    , cast(null as text) as \"priority\"\n    , cast(null as integer) as \"priority_rank\"\n    , cast(null as timestamptz) as \"sla_due_at\"\n    , cast(null as text) as \"sla_state\"\n    , cast(null as text) as \"status\"\n    , cast(null as text) as \"subject\"\n    , cast(array['value'] as text[]) as \"tag_slugs\"\n    , cast(null as bigint) as \"ticket_id\"\n    , cast('value' as text) as \"total_count\"\n    , cast(null as timestamptz) as \"updated_at\"\n    , cast(null as integer) as \"vip_rank\"\n;"
    },
    output: [
      {
        action_required: null,
        channel: null,
        created_at: null,
        customer_name: null,
        customer_tier: null,
        language: null,
        last_customer_reply_at: null,
        latest_message_at: null,
        latest_message_body: null,
        latest_sender_name: null,
        latest_sender_role: null,
        priority: null,
        priority_rank: null,
        sla_due_at: null,
        sla_state: null,
        status: null,
        subject: null,
        tag_slugs: [
          "value"
        ],
        ticket_id: null,
        total_count: "value",
        updated_at: null,
        vip_rank: null
      }
    ]
  }
];

export default cases;
