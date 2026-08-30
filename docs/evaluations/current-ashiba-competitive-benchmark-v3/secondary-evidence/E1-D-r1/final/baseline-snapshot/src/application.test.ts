import assert from 'node:assert/strict';
import test from 'node:test';

import { createApplication } from './application.js';

test('validates list input before attempting database access', async () => {
  const application = createApplication({
    connectionString: 'postgres://unused.invalid/test',
    schema: 'unused',
  });

  await assert.rejects(
    application.list({ limit: 0 }),
    (error: unknown) => (error as { code?: string }).code === 'VALIDATION',
  );
  await application.close();
});

test('close is idempotent and closes the public operations', async () => {
  const application = createApplication({
    connectionString: 'postgres://unused.invalid/test',
    schema: 'unused',
  });

  await application.close();
  await application.close();
  await assert.rejects(
    application.get({ id: '101' }),
    (error: unknown) => (error as { code?: string }).code === 'APPLICATION_CLOSED',
  );
});
