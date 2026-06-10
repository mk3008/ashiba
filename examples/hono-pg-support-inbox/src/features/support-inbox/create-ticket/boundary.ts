import type { FeatureQueryExecutor } from '#features/_shared/featureQueryExecutor.js';
import { parseRequest, type CreateSupportTicketRequest } from './input.js';
import { buildResult, type CreateSupportTicketResult } from './output.js';
import { executeWorkflow } from './workflow.js';

export async function execute(
  executor: FeatureQueryExecutor,
  rawRequest: unknown,
): Promise<CreateSupportTicketResult> {
  const request: CreateSupportTicketRequest = parseRequest(rawRequest);
  const result = await executeWorkflow(executor, request);
  return buildResult(result);
}
