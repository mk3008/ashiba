import type { UpdateTicketStatusRequest } from './input.js';
import type { UpdateTicketStatusQueryResult } from './queries/update-ticket-status/query.js';

export type UpdateTicketStatusResult = UpdateTicketStatusQueryResult;

class OptimisticConcurrencyConflict extends Error {
  constructor(ticketId: string, expectedVersionKey: number) {
    super(`Ticket ${ticketId} was changed before this update could be applied. Expected version_key ${expectedVersionKey}.`);
    this.name = 'OptimisticConcurrencyConflict';
  }
}

function buildUpdateTicketStatusResult(
  rows: UpdateTicketStatusQueryResult[],
  request: UpdateTicketStatusRequest,
): UpdateTicketStatusResult {
  const row = rows[0];
  if (!row) {
    throw new OptimisticConcurrencyConflict(request.ticket_id, request.expected_version_key);
  }
  return row;
}

export function buildResult(
  rows: UpdateTicketStatusQueryResult[],
  request: UpdateTicketStatusRequest,
): UpdateTicketStatusResult {
  return buildUpdateTicketStatusResult(rows, request);
}
