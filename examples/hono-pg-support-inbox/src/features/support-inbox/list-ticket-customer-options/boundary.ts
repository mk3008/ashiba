import type { FeatureQueryExecutor } from '#features/_shared/featureQueryExecutor.js';
import { parseRequest, type ListTicketCustomerOptionsRequest } from './input.js';
import { buildResult, type ListTicketCustomerOptionsResponse } from './output.js';
import { executeWorkflow } from './workflow.js';

export async function execute(
  executor: FeatureQueryExecutor,
  rawRequest: unknown,
): Promise<ListTicketCustomerOptionsResponse> {
  const request: ListTicketCustomerOptionsRequest = parseRequest(rawRequest);
  const result = await executeWorkflow(executor, request);
  return buildResult(result);
}
