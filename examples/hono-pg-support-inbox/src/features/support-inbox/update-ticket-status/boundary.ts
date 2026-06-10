import type { FeatureQueryExecutor } from '#features/_shared/featureQueryExecutor.js';
import { parseRequest } from './input.js';
import { buildResult, type UpdateTicketStatusResult } from './output.js';
import { executeWorkflow } from './workflow.js';

export async function execute(
  executor: FeatureQueryExecutor,
  rawRequest: unknown,
): Promise<UpdateTicketStatusResult> {
  const request = parseRequest(rawRequest);
  const result = await executeWorkflow(executor, request);
  return buildResult(result, request);
}
