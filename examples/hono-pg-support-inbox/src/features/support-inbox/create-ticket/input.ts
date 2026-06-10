export type CreateSupportTicketRequest = {
  customer_id: string;
  subject: string;
  priority: string;
  language: string;
  channel: string;
  sla_due_at?: string | null;
  message_body: string;
};

export function parseRequest(raw: unknown): CreateSupportTicketRequest {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error('Create ticket request must be an object.');
  }
  const record = raw as Record<string, unknown>;
  return {
    customer_id: readRequiredString(record, 'customer_id'),
    subject: readRequiredString(record, 'subject'),
    priority: readEnum(record, 'priority', ['high', 'medium', 'low']),
    language: readEnum(record, 'language', ['ja', 'en']),
    channel: readEnum(record, 'channel', ['email', 'chat', 'web']),
    sla_due_at: readOptionalDateTime(record, 'sla_due_at'),
    message_body: readRequiredString(record, 'message_body'),
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

function readOptionalDateTime(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  if (value === undefined || value === null || value === '') {
    return null;
  }
  if (typeof value !== 'string') {
    throw new Error(`${key} is invalid.`);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${key} is invalid.`);
  }
  return date.toISOString();
}
