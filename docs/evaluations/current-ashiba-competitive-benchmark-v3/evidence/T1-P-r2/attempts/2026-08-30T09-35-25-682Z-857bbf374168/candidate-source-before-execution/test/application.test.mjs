import assert from 'node:assert/strict';
import test from 'node:test';

import { createApplication } from '../dist/application.js';

const runtime = {
  connectionString: 'postgresql://candidate:[REDACTED]@127.0.0.1:5432/candidate',
  schema: 'candidate_nonce',
};

test('rejects malformed transfer values before connecting', async () => {
  const app = createApplication(runtime);

  await assert.rejects(
    app.transfer({ fromAccountId: '1', toAccountId: '2', amountCents: '0', note: '' }),
    (error) => error?.code === 'VALIDATION',
  );
  await app.close();
});

test('close is idempotent and terminal', async () => {
  const app = createApplication(runtime);

  await app.close();
  await app.close();
  await assert.rejects(
    app.transfer({ fromAccountId: '1', toAccountId: '2', amountCents: '1', note: '' }),
    (error) => error?.code === 'APPLICATION_CLOSED',
  );
});
