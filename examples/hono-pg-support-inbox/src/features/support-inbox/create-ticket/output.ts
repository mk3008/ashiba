import type { CreateTicketMessageQueryResult } from './queries/create-ticket-message/query.js';
import type { CreateTicketQueryResult } from './queries/create-ticket/query.js';

export type CreateSupportTicketResult = {
  ticket: CreateTicketQueryResult;
  message: CreateTicketMessageQueryResult;
};

export function buildResult(result: CreateSupportTicketResult): CreateSupportTicketResult {
  return result;
}
