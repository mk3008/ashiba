export type UpdateTicketStatusRequest = {
  ticket_id: string;
  status: string;
  expected_version_key: number;
};

export function parseRequest(raw: unknown): UpdateTicketStatusRequest {
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
