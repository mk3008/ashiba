import assert from 'node:assert/strict';
import test from 'node:test';

import { createApplication } from '../dist/application.js';

test('close is idempotent and terminal without opening a connection', async () => {
  const app = createApplication({
    connectionString: 'postgresql://unused:[REDACTED]@localhost:1/unused',
    schema: 'unused',
  });

  await app.close();
  await app.close();

  await assert.rejects(
    app.investigate({ requestedTag: 'priority', tier: 'gold' }),
    (error) => error?.code === 'APPLICATION_CLOSED',
  );
});
