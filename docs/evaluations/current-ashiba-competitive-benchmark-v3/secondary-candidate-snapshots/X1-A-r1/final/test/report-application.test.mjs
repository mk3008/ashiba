import assert from 'node:assert/strict';
import test from 'node:test';

import { createReportApplication } from '../dist/report-application.js';

test('rejects unsupported report vocabulary before connecting to PostgreSQL', async () => {
  const application = createReportApplication({
    connectionString: 'postgres://unused:unused@localhost:1/unused',
    schema: 'unused',
  });

  await assert.rejects(
    application.runReport({ dimensions: [], metric: 'count', includeTagJoin: false }),
    { code: 'VALIDATION' },
  );
  await assert.rejects(
    application.runReport({ dimensions: ['tag'], metric: 'count', includeTagJoin: false }),
    { code: 'VALIDATION' },
  );
  await application.close();
});

test('close is idempotent and prevents subsequent reports', async () => {
  const application = createReportApplication({
    connectionString: 'postgres://unused:unused@localhost:1/unused',
    schema: 'unused',
  });

  await Promise.all([application.close(), application.close()]);
  await assert.rejects(
    application.runReport({ dimensions: ['status'], metric: 'count', includeTagJoin: false }),
    { code: 'APPLICATION_CLOSED' },
  );
});
