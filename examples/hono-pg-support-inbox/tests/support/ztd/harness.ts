import type { FeatureQueryExecutor } from '@ashiba-ts/driver-adapter-core';
import type { QuerySpecZtdCase } from './case-types.js';
import { createQuerySpecZtdVerifier, type QuerySpecExecutionEvidence } from './verifier.js';

export type QuerySpecExecutorClient = FeatureQueryExecutor;

type QuerySpecExecutor<Input, Output> = (
  client: QuerySpecExecutorClient,
  input: Input,
) => Promise<Output>;

export async function runQuerySpecZtdCases<
  BeforeDb extends Record<string, unknown>,
  Input,
  Output,
>(
  cases: readonly QuerySpecZtdCase<BeforeDb, Input, Output>[],
  execute: QuerySpecExecutor<Input, Output>,
): Promise<QuerySpecExecutionEvidence[]> {
  const verifier = await createQuerySpecZtdVerifier();
  const evidence: QuerySpecExecutionEvidence[] = [];

  try {
    for (const querySpecCase of cases) {
      evidence.push(await verifier.verify(querySpecCase, execute));
    }
  } finally {
    await verifier.close();
  }

  return evidence;
}
