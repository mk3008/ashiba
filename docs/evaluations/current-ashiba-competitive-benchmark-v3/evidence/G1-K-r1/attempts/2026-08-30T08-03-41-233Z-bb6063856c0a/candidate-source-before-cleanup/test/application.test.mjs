import assert from 'node:assert/strict';
import test from 'node:test';
import { createApplication } from '../dist/application.js';

test('rejects malformed identifiers without connecting', async () => {
  const application = createApplication({ connectionString: 'postgres://unused', schema: 'unused' });
  await assert.rejects(application.get({ id: '0' }), (error) => error.code === 'VALIDATION');
  await application.close();
});

test('close is idempotent and guards operations', async () => {
  const application = createApplication({ connectionString: 'postgres://unused', schema: 'unused' });
  await application.close();
  await application.close();
  await assert.rejects(application.list(), (error) => error.code === 'APPLICATION_CLOSED');
});
