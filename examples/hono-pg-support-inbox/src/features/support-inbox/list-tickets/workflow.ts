import type { FeatureQueryExecutor } from '#features/_shared/featureQueryExecutor.js';
import type { SupportInboxRequest } from './input.js';
import { executeListTicketsQuery, type ListTicketsQueryParams, type ListTicketsQueryResult } from './queries/list-tickets/query.js';

export type SupportInboxWorkflowResult = ListTicketsQueryResult[];

export interface SupportInboxQueries {
  executeListTickets: (
    executor: FeatureQueryExecutor,
    params: ListTicketsQueryParams,
  ) => Promise<ListTicketsQueryResult[]>;
}

const defaultQueries: SupportInboxQueries = {
  executeListTickets: executeListTicketsQuery,
};

/** Runs feature orchestration after input parsing. Query functions are injectable for DB-free feature tests. */
export async function executeWorkflow(
  executor: FeatureQueryExecutor,
  request: SupportInboxRequest,
  queries: SupportInboxQueries = defaultQueries,
): Promise<SupportInboxWorkflowResult> {
  return queries.executeListTickets(executor, request);
}
