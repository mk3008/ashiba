import assert from 'node:assert/strict';
import test from 'node:test';
import { createApplication } from '../dist/application.js';

const runtime = { connectionString: 'postgresql://invalid:[REDACTED]@127.0.0.1:1/invalid', schema: 'ignored' };
test('validates malformed values before connecting', async () => {
  const app = createApplication(runtime);
  await assert.rejects(app.get({ id: '0' }), { code: 'VALIDATION' });
  await assert.rejects(app.list({ sort: 'untrusted' }), { code: 'VALIDATION' });
  await assert.rejects(app.create({ title: 'x', status: 'open', assignee: null, priority: 6 }), { code: 'VALIDATION' });
  await app.close();
});
test('close is idempotent and terminal', async () => {
  const app = createApplication(runtime); await app.close(); await app.close();
  await assert.rejects(app.list(), { code: 'APPLICATION_CLOSED' });
});
