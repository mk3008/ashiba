import assert from 'node:assert/strict';
import test from 'node:test';

import { createApplication } from '../dist/application.js';

test('close is idempotent and prevents claims', async () => {
  const application = createApplication({
    connectionString: 'postgres://unused',
    schema: 'nonce',
  });

  await application.close();
  await application.close();
  await assert.rejects(
    application.claim({ workerId: '1' }),
    (error) => error?.code === 'APPLICATION_CLOSED',
  );
});

test('claim validates workerId before opening a database connection', async () => {
  const application = createApplication({
    connectionString: 'postgres://unused',
    schema: 'nonce',
  });

  await assert.rejects(
    application.claim({ workerId: 'worker-1' }),
    (error) => error?.code === 'VALIDATION',
  );
  await application.close();
});
