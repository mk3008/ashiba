import assert from 'node:assert/strict';
import test from 'node:test';

import { createApplication } from '../dist/application.js';

test('rejects malformed Q1 input without opening a database connection', async () => {
  const app = createApplication({
    connectionString: 'postgres://unused:unused@127.0.0.1:1/unused',
    schema: 'benchmark_schema',
  });

  await assert.rejects(
    app.investigate({ requestedTag: /** @type {string} */ (/** @type {unknown} */ (42)), tier: 'gold' }),
    (error) => error?.code === 'VALIDATION',
  );
  await app.close();
});

test('a closed application rejects workload operations and close is idempotent', async () => {
  const app = createApplication({
    connectionString: 'postgres://unused:unused@127.0.0.1:1/unused',
    schema: 'benchmark_schema',
  });

  await app.close();
  await app.close();
  await assert.rejects(
    app.investigate({ requestedTag: 'vip', tier: 'gold' }),
    (error) => error?.code === 'APPLICATION_CLOSED',
  );
});
