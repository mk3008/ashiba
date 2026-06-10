import { expect, test } from 'vitest';

import type { FeatureQueryExecutor, FeatureQuerySource } from '#features/_shared/featureQueryExecutor.js';
import { execute } from '../boundary.js';

test('update-ticket-status applies parsed boundary input and returns the updated row', async () => {
  const calls: Array<{ id: string; params: Record<string, unknown> }> = [];
  const executor: FeatureQueryExecutor = {
    async query<T = unknown>(query: FeatureQuerySource, params: Record<string, unknown>): Promise<T[]> {
      calls.push({ id: query.id, params });
      return [
        {
          ticket_id: 10420,
          status: params.status,
          updated_at: params.updated_at,
          version_key: 3,
        },
      ] as T[];
    },
  };

  await expect(
    execute(executor, {
      ticket_id: ' 10420 ',
      status: 'resolved',
      expected_version_key: '2',
    }),
  ).resolves.toMatchObject({
    ticket_id: 10420,
    status: 'resolved',
    version_key: 3,
  });

  expect(calls).toHaveLength(1);
  expect(calls[0]?.id).toBe('update-ticket-status');
  expect(calls[0]?.params).toMatchObject({
    ticket_id: '10420',
    status: 'resolved',
    expected_version_key: 2,
  });
});

test('update-ticket-status reports an optimistic concurrency conflict when no row is updated', async () => {
  const executor: FeatureQueryExecutor = {
    async query<T = unknown>(): Promise<T[]> {
      return [];
    },
  };

  await expect(
    execute(executor, {
      ticket_id: '10420',
      status: 'resolved',
      expected_version_key: 2,
    }),
  ).rejects.toMatchObject({ name: 'OptimisticConcurrencyConflict' });
});
