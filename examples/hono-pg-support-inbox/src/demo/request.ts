import type { AshibaPostgresExecuteOptions } from '@ashiba-ts/driver-adapter-pg';

import type { ListTicketsQueryParams } from '#features/support-inbox/queries/list-tickets/query.js';

export type TicketSortKey =
  | 'action-required'
  | 'priority-high'
  | 'sla-soon'
  | 'customer-reply-new'
  | 'updated-new'
  | 'vip-first';

export type TicketFilters = {
  status: string;
  customerTier: string;
  slaState: string;
  language: string;
  channel: string;
  tag: string;
  keyword: string;
  sort: TicketSortKey;
  selectedTicketId?: string;
};

type SortInput = NonNullable<AshibaPostgresExecuteOptions['sort']>[number];

export const ticketSortInputs: Record<TicketSortKey, readonly SortInput[]> = {
  'action-required': [
    { key: 'action_required', direction: 'asc' },
    { key: 'sla_due_at', direction: 'asc' },
    { key: 'updated_at', direction: 'desc' },
  ],
  'priority-high': [
    { key: 'priority_rank', direction: 'asc' },
    { key: 'updated_at', direction: 'desc' },
  ],
  'sla-soon': [
    { key: 'sla_due_at', direction: 'asc' },
    { key: 'updated_at', direction: 'desc' },
  ],
  'customer-reply-new': [
    { key: 'last_customer_reply_at', direction: 'desc' },
    { key: 'updated_at', direction: 'desc' },
  ],
  'updated-new': [{ key: 'updated_at', direction: 'desc' }],
  'vip-first': [
    { key: 'vip_rank', direction: 'asc' },
    { key: 'updated_at', direction: 'desc' },
  ],
};

const knownSorts = new Set<TicketSortKey>(Object.keys(ticketSortInputs) as TicketSortKey[]);

export function parseTicketFilters(url: URL): TicketFilters {
  const sort = normalizeSort(url.searchParams.get('sort'));
  return {
    status: normalizeOption(url.searchParams.get('status')),
    customerTier: normalizeOption(url.searchParams.get('customerTier')),
    slaState: normalizeOption(url.searchParams.get('slaState')),
    language: normalizeOption(url.searchParams.get('language')),
    channel: normalizeOption(url.searchParams.get('channel')),
    tag: normalizeOption(url.searchParams.get('tag')),
    keyword: normalizeKeyword(url.searchParams.get('keyword')),
    sort,
    selectedTicketId: normalizeTicketId(url.searchParams.get('ticketId')),
  };
}

export function toListTicketsParams(filters: TicketFilters): ListTicketsQueryParams {
  return {
    status: nullable(filters.status),
    customerTier: nullable(filters.customerTier),
    slaState: nullable(filters.slaState),
    language: nullable(filters.language),
    channel: nullable(filters.channel),
    tag: nullable(filters.tag),
    keyword: nullable(filters.keyword),
    limit: 50,
    offset: 0,
  };
}

export function toTicketSort(filters: TicketFilters): readonly SortInput[] {
  return ticketSortInputs[filters.sort];
}

function normalizeSort(value: string | null): TicketSortKey {
  return value && knownSorts.has(value as TicketSortKey) ? (value as TicketSortKey) : 'action-required';
}

function normalizeOption(value: string | null): string {
  return value?.trim() ?? '';
}

function normalizeKeyword(value: string | null): string {
  return value?.trim().slice(0, 80) ?? '';
}

function normalizeTicketId(value: string | null): string | undefined {
  return value && /^\d+$/.test(value) ? value : undefined;
}

function nullable(value: string): string | null {
  return value === '' ? null : value;
}
