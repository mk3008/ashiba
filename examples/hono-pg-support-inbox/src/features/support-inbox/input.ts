import type { ListTicketsQueryParams } from './queries/list-tickets/query.js';

export type SupportInboxRequest = ListTicketsQueryParams;

/**
 * Imported-SQL features keep request parsing intentionally thin.
 * Add domain validation here after deciding the application boundary contract.
 */
export function parseRequest(raw: unknown): SupportInboxRequest {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error('Feature request must be an object.');
  }
  const record = raw as Partial<Record<keyof ListTicketsQueryParams, unknown>>;
  return {
    status: record["status"] as unknown,
    customerTier: record["customerTier"] as unknown,
    slaState: record["slaState"] as unknown,
    language: record["language"] as unknown,
    channel: record["channel"] as unknown,
    tag: record["tag"] as unknown,
    keyword: record["keyword"] as unknown,
    limit: record["limit"] as unknown,
    offset: record["offset"] as unknown,
  };
}
