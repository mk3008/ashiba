import { expect, test } from 'vitest';

import { execute } from '../boundary.js';
import type { FeatureQueryExecutor } from '#features/_shared/featureQueryExecutor.js';
import type { ListTicketsQueryResult } from '../queries/list-tickets/query.js';

test('support-inbox executes imported list-tickets query boundary through injected workflow', async () => {
  const request = {
    status: "value",
    customerTier: "value",
    slaState: "value",
    language: "value",
    channel: "value",
    tag: "value",
    keyword: "value",
    limit: "value",
    offset: "value"
  };
  const row: ListTicketsQueryResult = {
    action_required: 1,
    channel: "value",
    created_at: "value",
    customer_name: "value",
    customer_tier: "value",
    language: "value",
    last_customer_reply_at: "value",
    latest_message_at: "value",
    latest_message_body: "value",
    latest_sender_name: "value",
    latest_sender_role: "value",
    priority: "value",
    priority_rank: 1,
    sla_due_at: "value",
    sla_state: "value",
    status: "value",
    subject: "value",
    tag_slugs: ["value"],
    ticket_id: "1",
    total_count: 1,
    updated_at: "value",
    vip_rank: 1
  };
  const executor: FeatureQueryExecutor = {
    async query<T = unknown>() {
      return [row] as T[];
    },
  };

  await expect(execute(executor, request)).resolves.toEqual({
    items: [
      {
        action_required: 1,
        channel: "value",
        created_at: "value",
        customer_name: "value",
        customer_tier: "value",
        language: "value",
        last_customer_reply_at: "value",
        latest_message_at: "value",
        latest_message_body: "value",
        latest_sender_name: "value",
        latest_sender_role: "value",
        priority: "value",
        priority_rank: 1,
        sla_due_at: "value",
        sla_state: "value",
        status: "value",
        subject: "value",
        tag_slugs: ["value"],
        ticket_id: "1",
        updated_at: "value",
        vip_rank: 1
      }
    ]
  });
});

// SupportInbox starts from imported SQL. Add boundary-level behavior cases as requirements grow.
