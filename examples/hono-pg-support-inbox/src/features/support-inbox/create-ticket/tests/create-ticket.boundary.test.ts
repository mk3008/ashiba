import { expect, test } from 'vitest';

import type { FeatureQueryExecutor } from '#features/_shared/featureQueryExecutor.js';
import { execute } from '../boundary.js';

test('create-ticket creates the ticket and first message through parsed boundary input', async () => {
  const calls: Array<{ id: string; params: Record<string, unknown> }> = [];
  const executor: FeatureQueryExecutor = {
    async query(query, params) {
      calls.push({ id: query.id, params });
      if (query.id === 'list-customers-for-ticket') {
        return [
          {
            customer_id: '1001',
            name: '山田 太郎',
            tier: 'vip',
            locale: 'ja',
            created_at: '2026-06-01T00:00:00.000Z',
          },
        ];
      }
      if (query.id === 'create-ticket') {
        return [
          {
            ticket_id: '10420',
            customer_id: params.customer_id,
            subject: params.subject,
            status: params.status,
            priority: params.priority,
            language: params.language,
            channel: params.channel,
            sla_due_at: params.sla_due_at,
            created_at: params.created_at,
            updated_at: params.updated_at,
            version_key: 1,
            metadata: null,
          },
        ];
      }
      if (query.id === 'create-ticket-message') {
        return [
          {
            message_id: '9001',
            ticket_id: params.ticket_id,
            sender_name: params.sender_name,
            sender_role: params.sender_role,
            body: params.body,
            created_at: params.created_at,
          },
        ];
      }
      throw new Error(`Unexpected query: ${query.id}`);
    },
  };

  const result = await execute(executor, {
    customer_id: ' 1001 ',
    subject: '  ログインできません ',
    priority: 'high',
    language: 'ja',
    channel: 'email',
    sla_due_at: '',
    message_body: '  パスワードリセット後も失敗します。 ',
  });

  expect(result.ticket).toMatchObject({
    ticket_id: '10420',
    customer_id: '1001',
    subject: 'ログインできません',
    status: 'waiting_agent',
    priority: 'high',
  });
  expect(result.message).toMatchObject({
    ticket_id: '10420',
    sender_name: '山田 太郎',
    sender_role: 'customer',
    body: 'パスワードリセット後も失敗します。',
  });
  expect(calls.map((call) => call.id)).toEqual([
    'list-customers-for-ticket',
    'create-ticket',
    'create-ticket-message',
  ]);
});
