import type { FeatureQueryExecutor } from '#features/_shared/featureQueryExecutor.js';
import { executeCreateTicketMessageQuery, type CreateTicketMessageQueryResult } from './queries/create-ticket-message/query.js';
import { executeCreateTicketQuery, type CreateTicketQueryResult } from './queries/create-ticket/query.js';
import { executeListCustomersForTicketQuery, type ListCustomersForTicketQueryResult } from './queries/list-customers-for-ticket/query.js';

export type CreateSupportTicketRequest = {
  customer_id: string;
  subject: string;
  priority: string;
  language: string;
  channel: string;
  sla_due_at?: string | null;
  message_body: string;
};

export type CreateSupportTicketResult = {
  ticket: CreateTicketQueryResult;
  message: CreateTicketMessageQueryResult;
};

export type TicketCustomerOption = {
  customer_id: string;
  name: string;
  tier: string;
  locale: string;
};

export async function listTicketCustomerOptions(executor: FeatureQueryExecutor): Promise<TicketCustomerOption[]> {
  const rows = await executeListCustomersForTicketQuery(executor, { limit: 50 });
  return rows.map((row) => ({
    customer_id: row.customer_id,
    name: row.name,
    tier: row.tier,
    locale: row.locale,
  }));
}

export async function createSupportTicket(
  executor: FeatureQueryExecutor,
  rawRequest: unknown,
): Promise<CreateSupportTicketResult> {
  const request = parseCreateSupportTicketRequest(rawRequest);
  const customers = await listTicketCustomerOptions(executor);
  const customer = customers.find((item) => item.customer_id === request.customer_id);
  if (!customer) {
    throw new Error('Selected customer was not found.');
  }

  const now = new Date().toISOString();
  const ticket = await executeCreateTicketQuery(executor, {
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
  const message = await executeCreateTicketMessageQuery(executor, {
    ticket_id: ticket.ticket_id,
    sender_name: customer.name,
    sender_role: 'customer',
    body: request.message_body,
    created_at: now,
  });

  return { ticket, message };
}

function parseCreateSupportTicketRequest(raw: unknown): CreateSupportTicketRequest {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error('Create ticket request must be an object.');
  }
  const record = raw as Record<string, unknown>;
  const request: CreateSupportTicketRequest = {
    customer_id: readRequiredString(record, 'customer_id'),
    subject: readRequiredString(record, 'subject'),
    priority: readEnum(record, 'priority', ['high', 'medium', 'low']),
    language: readEnum(record, 'language', ['ja', 'en']),
    channel: readEnum(record, 'channel', ['email', 'chat', 'web']),
    sla_due_at: readOptionalDateTime(record, 'sla_due_at'),
    message_body: readRequiredString(record, 'message_body'),
  };
  return request;
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
