import assert from 'node:assert/strict';
import test from 'node:test';
import { createApplication } from '../dist/application.js';

test('rejects invalid public input and rejects calls after close', async () => {
  const application = createApplication({
    connectionString: 'postgresql://candidate:unused@localhost:5432/candidate',
    schema: 'unused',
  });

  await assert.rejects(
    application.list({ sort: 'untrusted' }),
    (error) => error?.code === 'VALIDATION',
  );

  await application.close();

  await assert.rejects(
    application.get({ id: '101' }),
    (error) => error?.code === 'APPLICATION_CLOSED',
  );
});
