import { expect, test } from 'vitest';

import { runQuerySpecZtdCases } from '#tests/support/ztd/harness.js';
import { executeInsertTransferSettingDestinationDefinitionQuery } from '../query.js';
import logicCases from './cases/logic.case.js';
import mappingCases from './generated/mapping.cases.js';

const cases = [...mappingCases, ...logicCases];

const shouldSkipZtd =
  process.env.ASHIBA_SKIP_DB_BACKED_TESTS === '1' ||
  cases.length === 0;

const testZtd = shouldSkipZtd ? test.skip : test;

testZtd('create-transfer-setting/insert-transfer-setting-destination-definition boundary ZTD cases run through the fixed app-level harness', async () => {
  expect(cases.length).toBeGreaterThan(0);
  const evidence = await runQuerySpecZtdCases(cases, executeInsertTransferSettingDestinationDefinitionQuery);
  expect(evidence.every((entry) => entry.mode === 'ztd')).toBe(true);
  expect(evidence.every((entry) => entry.physicalSetupUsed === false)).toBe(true);
  expect(evidence.every((entry) => entry.executedQueryCount > 0)).toBe(true);
});
