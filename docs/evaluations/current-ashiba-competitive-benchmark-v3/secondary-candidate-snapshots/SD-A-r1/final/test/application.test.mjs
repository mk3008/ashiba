import assert from 'node:assert/strict';
import test from 'node:test';
import { createApplication } from '../dist/application.js';

test('close is idempotent and rejects later workload operations', async () => {
  const app = createApplication({
    connectionString: 'postgres://127.0.0.1:1/not_used',
    schema: 'not_used',
  });

  await app.close();
  await app.close();
  await assert.rejects(app.list(), { code: 'APPLICATION_CLOSED' });
});

test('invalid inputs reject before a database connection is attempted', async () => {
  const app = createApplication({
    connectionString: 'postgres://127.0.0.1:1/not_used',
    schema: 'not_used',
  });

  await assert.rejects(app.list({ sort: 'title' }), { code: 'VALIDATION' });
  await assert.rejects(app.get({ id: '0' }), { code: 'VALIDATION' });
  await assert.rejects(app.create({ title: 'x', status: 'open', assignee: null, priority: 6 }), { code: 'VALIDATION' });
  await assert.rejects(app.assign({ id: '1', assignee: 4 }), { code: 'VALIDATION' });
  await app.close();
});
