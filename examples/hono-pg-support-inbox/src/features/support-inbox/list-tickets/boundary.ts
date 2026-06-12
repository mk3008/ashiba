import type { FeatureQueryExecutor } from '#features/_shared/featureQueryExecutor.js';
import { parseRequest, type SupportInboxRequest } from './input.js';
import { buildResult, type SupportInboxResponse } from './output.js';
import { executeWorkflow } from './workflow.js';

/**
 * Executes the support-inbox feature boundary.
 *
 * Review order:
 * 1. parse and normalize caller input
 * 2. run feature workflow with query-boundary dependencies
 * 3. shape the response for the caller boundary
 */
export async function execute(
  executor: FeatureQueryExecutor,
  rawRequest: unknown,
): Promise<SupportInboxResponse> {
  const request = parseRequest(rawRequest);
  const result = await executeWorkflow(executor, request);
  return buildResult(result);
}
