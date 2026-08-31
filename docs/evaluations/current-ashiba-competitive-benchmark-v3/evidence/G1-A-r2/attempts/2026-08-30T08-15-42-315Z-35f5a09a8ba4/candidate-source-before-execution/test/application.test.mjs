import assert from 'node:assert/strict';
import test from 'node:test';
import { createApplication } from '../dist/application.js';

test('validates locally and rejects operations after close', async () => {
  const app = createApplication({
    connectionString: 'postgresql://localhost:1/not-used-by-this-test',
    schema: 'ignored',
  });

  await assert.rejects(app.get({ id: '0' }), { code: 'VALIDATION' });
  await app.close();
  await app.close();
  await assert.rejects(app.list(), { code: 'APPLICATION_CLOSED' });
});
