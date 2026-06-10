import type { FeatureQueryExecutor } from '#features/_shared/featureQueryExecutor.js';
import type { CreateSupportTicketRequest } from './input.js';
import {
  executeCreateTicketMessageQuery,
  type CreateTicketMessageQueryParams,
  type CreateTicketMessageQueryResult,
} from './queries/create-ticket-message/query.js';
import {
  executeCreateTicketQuery,
  type CreateTicketQueryParams,
  type CreateTicketQueryResult,
} from './queries/create-ticket/query.js';
import {
  executeListCustomersForTicketQuery,
  type ListCustomersForTicketQueryParams,
  type ListCustomersForTicketQueryResult,
} from './queries/list-customers-for-ticket/query.js';

type CreateSupportTicketWorkflowResult = {
  ticket: CreateTicketQueryResult;
  message: CreateTicketMessageQueryResult;
};

interface CreateSupportTicketQueries {
  executeListCustomersForTicket: (
    executor: FeatureQueryExecutor,
    params: ListCustomersForTicketQueryParams,
  ) => Promise<ListCustomersForTicketQueryResult[]>;
  executeCreateTicket: (
    executor: FeatureQueryExecutor,
    params: CreateTicketQueryParams,
  ) => Promise<CreateTicketQueryResult>;
  executeCreateTicketMessage: (
    executor: FeatureQueryExecutor,
    params: CreateTicketMessageQueryParams,
  ) => Promise<CreateTicketMessageQueryResult>;
}

const defaultQueries: CreateSupportTicketQueries = {
  executeListCustomersForTicket: executeListCustomersForTicketQuery,
  executeCreateTicket: executeCreateTicketQuery,
  executeCreateTicketMessage: executeCreateTicketMessageQuery,
};

async function listTicketCustomerOptionRows(
  executor: FeatureQueryExecutor,
  queries: Pick<CreateSupportTicketQueries, 'executeListCustomersForTicket'> = defaultQueries,
): Promise<ListCustomersForTicketQueryResult[]> {
  return queries.executeListCustomersForTicket(executor, { limit: 50 });
}

export async function executeWorkflow(
  executor: FeatureQueryExecutor,
  request: CreateSupportTicketRequest,
  queries: CreateSupportTicketQueries = defaultQueries,
): Promise<CreateSupportTicketWorkflowResult> {
  const customers = await listTicketCustomerOptionRows(executor, queries);
  const customer = customers.find((item) => item.customer_id === request.customer_id);
  if (!customer) {
    throw new Error('Selected customer was not found.');
  }

  const now = new Date().toISOString();
  const ticket = await queries.executeCreateTicket(executor, {
    customer_id: request.customer_id,
    subject: request.subject,
    status: 'waiting_agent',
    priority: request.priority,
    language: request.language,
    channel: request.channel,
    sla_due_at: request.sla_due_at ?? null,
    created_at: now,
    updated_at: now,
  });
  const message = await queries.executeCreateTicketMessage(executor, {
    ticket_id: ticket.ticket_id,
    sender_name: customer.name,
    sender_role: 'customer',
    body: request.message_body,
    created_at: now,
  });

  return { ticket, message };
}
