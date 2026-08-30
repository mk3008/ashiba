import assert from 'node:assert/strict';
import test from 'node:test';

import { createApplication } from './application.js';

test('operations reject after close and close is idempotent', async () => {
  const app = createApplication({
    connectionString: 'postgres://unused:[REDACTED]@127.0.0.1:1/unused',
    schema: 'candidate_test',
  });

  await Promise.all([app.close(), app.close()]);

  for (const operation of [
    app.investigate({ requestedTag: 'vip', tier: 'gold' }),
    app.explain({ requestedTag: 'vip', tier: 'gold' }),
  ]) {
    await assert.rejects(
      operation,
      (error: unknown) =>
        typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'APPLICATION_CLOSED',
    );
  }
});
