export interface ListTicketCustomerOptionsRequest {
  limit: number;
}

export function parseRequest(raw: unknown): ListTicketCustomerOptionsRequest {
  if (raw === undefined || raw === null) {
    return { limit: 50 };
  }
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('List ticket customer options request must be an object.');
  }
  const record = raw as Record<string, unknown>;
  return {
    limit: readLimit(record.limit),
  };
}

function readLimit(value: unknown): number {
  if (value === undefined || value === null || value === '') {
    return 50;
  }
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 100) {
    throw new Error('limit is invalid.');
  }
  return parsed;
}
