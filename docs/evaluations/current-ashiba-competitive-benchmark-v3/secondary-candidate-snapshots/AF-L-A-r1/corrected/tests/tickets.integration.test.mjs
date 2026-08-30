import assert from 'node:assert/strict';
import test from 'node:test';

import { createApplication } from '../dist/application.js';

test('rejects unsupported finite sort values before acquiring a database connection', async () => {
  const app = createApplication({
    connectionString: 'postgresql://unused:unused@127.0.0.1:1/unused',
    schema: 'unused',
  });

  await assert.rejects(app.list({ sort: 'title' }), { code: 'VALIDATION' });
  await app.close();
});

test('close is idempotent and closes the application boundary', async () => {
  const app = createApplication({
    connectionString: 'postgresql://unused:unused@127.0.0.1:1/unused',
    schema: 'unused',
  });

  await Promise.all([app.close(), app.close()]);
  await assert.rejects(app.get({ id: '101' }), { code: 'APPLICATION_CLOSED' });
});
