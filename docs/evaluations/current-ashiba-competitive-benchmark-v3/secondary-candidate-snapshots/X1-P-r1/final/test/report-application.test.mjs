import assert from 'node:assert/strict';
import test from 'node:test';
import { createReportApplication } from '../dist/report-application.js';

const runtime = {
  connectionString: 'postgresql://candidate:password@127.0.0.1:1/benchmark',
  schema: 'nonce_schema',
};

const hasCode = (code) => (error) => error?.code === code;

test('rejects invalid vocabulary before opening a database connection', async () => {
  const application = createReportApplication(runtime);

  await assert.rejects(
    application.runReport({ dimensions: [], metric: 'count', includeTagJoin: false }),
    hasCode('VALIDATION'),
  );
  await assert.rejects(
    application.runReport({ dimensions: ['tag'], metric: 'count', includeTagJoin: false }),
    hasCode('VALIDATION'),
  );
  await assert.rejects(
    application.runReport({
      dimensions: ['status'],
      metric: 'count',
      includeTagJoin: true,
      requestedTag: "x' OR TRUE --",
      statuses: ['unknown'],
    }),
    hasCode('VALIDATION'),
  );

  await application.close();
});

test('close is idempotent and makes future report calls fail predictably', async () => {
  const application = createReportApplication(runtime);
  await application.close();
  await application.close();

  await assert.rejects(
    application.runReport({ dimensions: ['status'], metric: 'count', includeTagJoin: false }),
    hasCode('APPLICATION_CLOSED'),
  );
});
