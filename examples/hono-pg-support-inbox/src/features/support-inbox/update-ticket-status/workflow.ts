import type { FeatureQueryExecutor } from '#features/_shared/featureQueryExecutor.js';
import type { UpdateTicketStatusRequest } from './input.js';
import {
  executeUpdateTicketStatusQuery,
  type UpdateTicketStatusQueryParams,
  type UpdateTicketStatusQueryResult,
} from './queries/update-ticket-status/query.js';

type UpdateTicketStatusWorkflowResult = UpdateTicketStatusQueryResult[];

interface UpdateTicketStatusQueries {
  executeUpdateTicketStatus: (
    executor: FeatureQueryExecutor,
    params: UpdateTicketStatusQueryParams,
  ) => Promise<UpdateTicketStatusQueryResult[]>;
}

const defaultQueries: UpdateTicketStatusQueries = {
  executeUpdateTicketStatus: executeUpdateTicketStatusQuery,
};

export async function executeWorkflow(
  executor: FeatureQueryExecutor,
  request: UpdateTicketStatusRequest,
  queries: UpdateTicketStatusQueries = defaultQueries,
): Promise<UpdateTicketStatusWorkflowResult> {
  return queries.executeUpdateTicketStatus(executor, {
    ticket_id: request.ticket_id,
    status: request.status,
    updated_at: new Date().toISOString(),
    expected_version_key: request.expected_version_key,
  });
}
