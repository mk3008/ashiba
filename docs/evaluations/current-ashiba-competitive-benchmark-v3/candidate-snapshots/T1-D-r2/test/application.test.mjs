import assert from 'node:assert/strict';
import test from 'node:test';

import { createApplication } from '../dist/application.js';

test('invalid transfer input rejects before a database connection is used', async () => {
  const app = createApplication({
    connectionString: 'postgres://localhost:5432/benchmark',
    schema: 'candidate_test',
  });

  await assert.rejects(
    app.transfer({ fromAccountId: '0', toAccountId: '2', amountCents: '1', note: '' }),
    (error) => error?.code === 'VALIDATION',
  );
  await app.close();
});

test('close is idempotent and closes the workload operation', async () => {
  const app = createApplication({
    connectionString: 'postgres://localhost:5432/benchmark',
    schema: 'candidate_test',
  });

  await app.close();
  await app.close();
  await assert.rejects(
    app.transfer({ fromAccountId: '1', toAccountId: '2', amountCents: '1', note: '' }),
    (error) => error?.code === 'APPLICATION_CLOSED',
  );
});
