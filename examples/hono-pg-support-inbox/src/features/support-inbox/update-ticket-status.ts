import type { FeatureQueryExecutor } from '#features/_shared/featureQueryExecutor.js';
import {
  executeUpdateTicketStatusQuery,
  type UpdateTicketStatusQueryResult,
} from './queries/update-ticket-status/query.js';

export type UpdateTicketStatusRequest = {
  ticket_id: string;
  status: string;
  expected_version_key: number;
};

export class OptimisticConcurrencyConflict extends Error {
  constructor(ticketId: string, expectedVersionKey: number) {
    super(`Ticket ${ticketId} was changed before this update could be applied. Expected version_key ${expectedVersionKey}.`);
    this.name = 'OptimisticConcurrencyConflict';
  }
}

export async function updateTicketStatus(
  executor: FeatureQueryExecutor,
  rawRequest: unknown,
): Promise<UpdateTicketStatusQueryResult> {
  const request = parseUpdateTicketStatusRequest(rawRequest);
  const rows = await executeUpdateTicketStatusQuery(executor, {
    ticket_id: request.ticket_id,
    status: request.status,
    updated_at: new Date().toISOString(),
    expected_version_key: request.expected_version_key,
  });
  const row = rows[0];
  if (!row) {
    throw new OptimisticConcurrencyConflict(request.ticket_id, request.expected_version_key);
  }
  return row;
}

function parseUpdateTicketStatusRequest(raw: unknown): UpdateTicketStatusRequest {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error('Update ticket status request must be an object.');
  }
  const record = raw as Record<string, unknown>;
  return {
    ticket_id: readRequiredString(record, 'ticket_id'),
    status: readEnum(record, 'status', ['open', 'waiting_customer', 'waiting_agent', 'resolved', 'draft']),
    expected_version_key: readRequiredInteger(record, 'expected_version_key'),
  };
}

function readRequiredString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${key} is required.`);
  }
  return value.trim();
}

function readEnum<T extends string>(record: Record<string, unknown>, key: string, values: readonly T[]): T {
  const value = readRequiredString(record, key);
  if (!values.includes(value as T)) {
    throw new Error(`${key} is invalid.`);
  }
  return value as T;
}

function readRequiredInteger(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
  if (!Number.isInteger(parsed)) {
    throw new Error(`${key} is invalid.`);
  }
  return parsed;
}
