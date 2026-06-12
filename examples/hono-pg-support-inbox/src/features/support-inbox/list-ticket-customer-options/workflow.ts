import type { FeatureQueryExecutor } from '#features/_shared/featureQueryExecutor.js';
import type { ListTicketCustomerOptionsRequest } from './input.js';
import {
  executeListCustomersForTicketQuery,
  type ListCustomersForTicketQueryParams,
  type ListCustomersForTicketQueryResult,
} from './queries/list-customers-for-ticket/query.js';

type ListTicketCustomerOptionsWorkflowResult = ListCustomersForTicketQueryResult[];

interface ListTicketCustomerOptionsQueries {
  executeListCustomersForTicket: (
    executor: FeatureQueryExecutor,
    params: ListCustomersForTicketQueryParams,
  ) => Promise<ListCustomersForTicketQueryResult[]>;
}

const defaultQueries: ListTicketCustomerOptionsQueries = {
  executeListCustomersForTicket: executeListCustomersForTicketQuery,
};

export async function executeWorkflow(
  executor: FeatureQueryExecutor,
  request: ListTicketCustomerOptionsRequest,
  queries: ListTicketCustomerOptionsQueries = defaultQueries,
): Promise<ListTicketCustomerOptionsWorkflowResult> {
  return queries.executeListCustomersForTicket(executor, { limit: request.limit });
}
