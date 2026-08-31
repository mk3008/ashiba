import assert from 'node:assert/strict';
import test from 'node:test';

import { createApplication, type ApplicationError } from './application.js';

function hasCode(error: unknown, code: ApplicationError['code']): boolean {
  return typeof error === 'object' && error !== null && (error as Partial<ApplicationError>).code === code;
}

test('rejects malformed input before opening a database connection', async () => {
  const app = createApplication({ connectionString: 'postgres://unused', schema: 'nonce_schema' });

  await assert.rejects(
    app.investigate({ requestedTag: 1, tier: 'gold' } as never),
    (error: unknown) => hasCode(error, 'VALIDATION'),
  );

  await app.close();
  await app.close();

  await assert.rejects(
    app.explain({ requestedTag: 'vip', tier: 'gold' }),
    (error: unknown) => hasCode(error, 'APPLICATION_CLOSED'),
  );
});
