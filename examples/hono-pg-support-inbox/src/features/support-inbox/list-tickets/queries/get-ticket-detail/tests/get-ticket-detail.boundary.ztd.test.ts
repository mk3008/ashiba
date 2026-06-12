import { expect, test } from 'vitest';

import { runQuerySpecZtdCases } from '#tests/support/ztd/harness.js';
import { executeGetTicketDetailQuery } from '../query.js';
import logicCases from './cases/logic.case.js';
import mappingCases from './generated/mapping.cases.js';

const cases = [...mappingCases, ...logicCases];

const shouldSkipZtd =
  process.env.ASHIBA_SKIP_DB_BACKED_TESTS === '1' ||
  cases.length === 0;

const testZtd = shouldSkipZtd ? test.skip : test;

testZtd('list-tickets/get-ticket-detail boundary ZTD cases run through the fixed app-level harness', async () => {
  expect(cases.length).toBeGreaterThan(0);
  const evidence = await runQuerySpecZtdCases(cases, executeGetTicketDetailQuery);
  expect(evidence.every((entry) => entry.mode === 'ztd')).toBe(true);
  expect(evidence.every((entry) => entry.physicalSetupUsed === false)).toBe(true);
  expect(evidence.every((entry) => entry.executedQueryCount > 0)).toBe(true);
});
