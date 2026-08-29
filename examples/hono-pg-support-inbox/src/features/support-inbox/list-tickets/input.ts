import type { ListTicketsQueryParams } from './queries/list-tickets/query.js';

export type SupportInboxRequest = ListTicketsQueryParams;

/**
 * Imported-SQL features keep request parsing intentionally thin.
 * Add domain validation here after deciding the application boundary contract.
 */
export function parseRequest(raw: unknown): SupportInboxRequest {
  if (!isRecord(raw)) {
    throw new Error('Feature request must be an object.');
  }
  const record = raw;
  return {
    status: readNullableString(record.status, 'status'),
    customerTier: readNullableString(record.customerTier, 'customerTier'),
    slaState: readNullableString(record.slaState, 'slaState'),
    language: readNullableString(record.language, 'language'),
    channel: readNullableString(record.channel, 'channel'),
    tag: readNullableString(record.tag, 'tag'),
    keyword: record.keyword,
    limit: readNumber(record.limit, 'limit'),
    offset: readNumber(record.offset, 'offset'),
    sort_1: null,
    sort_2: null,
    sort_3: null,
    sort_4: null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readNullableString(value: unknown, name: string): string | null {
  if (value === null) return null;
  if (typeof value === 'string') return value;
  throw new Error(`Feature request parameter ${name} must be null or string.`);
}

function readNumber(value: unknown, name: string): number {
  if (typeof value === 'number') return value;
  throw new Error(`Feature request parameter ${name} must be number.`);
}
