import { expect, test } from 'vitest';

import type { FeatureQueryExecutor, FeatureQuerySource } from '#features/_shared/featureQueryExecutor.js';
import { execute } from '../boundary.js';

test('list-ticket-customer-options maps customers through the execute boundary', async () => {
  const executor: FeatureQueryExecutor = {
    async query<T = unknown>(query: FeatureQuerySource, params: Record<string, unknown>): Promise<T[]> {
      expect(query.id).toBe('list-customers-for-ticket');
      expect(params).toEqual({ limit: 50 });
      return [
        {
          customer_id: '1001',
          name: '山田 太郎',
          tier: 'vip',
          locale: 'ja',
          created_at: '2026-06-01T00:00:00.000Z',
        },
      ] as T[];
    },
  };

  await expect(execute(executor, {})).resolves.toEqual({
    items: [
      {
        customer_id: '1001',
        name: '山田 太郎',
        tier: 'vip',
        locale: 'ja',
      },
    ],
  });
});
