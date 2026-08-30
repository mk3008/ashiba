import assert from 'node:assert/strict';
import test from 'node:test';

import { createApplication } from '../dist/application.js';

test('validates input and makes close idempotent without opening a connection', async () => {
  const application = createApplication({ connectionString: '', schema: 'ignored' });

  await assert.rejects(
    application.claim({ workerId: '  ' }),
    (error) => error?.code === 'VALIDATION',
  );

  await application.close();
  await application.close();

  await assert.rejects(
    application.claim({ workerId: 'worker-a' }),
    (error) => error?.code === 'APPLICATION_CLOSED',
  );
});
