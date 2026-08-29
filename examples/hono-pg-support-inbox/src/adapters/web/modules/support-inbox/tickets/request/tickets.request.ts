import type { ListTicketsQueryParams, ListTicketsSort, ListTicketsSortKey } from '#features/support-inbox/list-tickets/queries/list-tickets/query.js';

export type TicketSortKey =
  | 'action-required'
  | 'priority-high'
  | 'sla-soon'
  | 'customer-reply-new'
  | 'updated-new'
  | 'vip-first';

export type TicketColumnSortKey =
  | 'ticket_id'
  | 'subject'
  | 'customer_name'
  | 'customer_tier'
  | 'status'
  | 'priority_rank'
  | 'sla_due_at'
  | 'sla_state'
  | 'latest_message_at'
  | 'language'
  | 'channel'
  | 'updated_at';

export type TicketSortValue = string;

export type TicketFilters = {
  status: string;
  customerTier: string;
  slaState: string;
  language: string;
  channel: string;
  tag: string;
  keyword: string;
  sort: TicketSortValue;
  page: number;
  selectedTicketId?: string;
};

export type SortInput = ListTicketsSort;

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

export const ticketColumnSortInputs: Record<TicketColumnSortKey, SortInput['key']> = {
  ticket_id: 'ticket_id',
  subject: 'subject',
  customer_name: 'customer_name',
  customer_tier: 'customer_tier',
  status: 'status',
  priority_rank: 'priority_rank',
  sla_due_at: 'sla_due_at',
  sla_state: 'sla_state',
  latest_message_at: 'latest_message_at',
  language: 'language',
  channel: 'channel',
  updated_at: 'updated_at',
};

const knownSorts = new Set<TicketSortKey>(Object.keys(ticketSortInputs) as TicketSortKey[]);
const knownColumnSorts = new Set<TicketColumnSortKey>(Object.keys(ticketColumnSortInputs) as TicketColumnSortKey[]);

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
    page: normalizePage(url.searchParams.get('page')),
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
    limit: 10,
    offset: (filters.page - 1) * 10,
  };
}

export function toTicketSort(filters: TicketFilters): readonly SortInput[] {
  if (filters.sort === '') {
    return [];
  }
  if (knownSorts.has(filters.sort as TicketSortKey)) {
    return withStableTicketId(ticketSortInputs[filters.sort as TicketSortKey]);
  }
  return withStableTicketId(parseColumnSort(filters.sort));
}

function withStableTicketId(sort: readonly SortInput[]): readonly SortInput[] {
  if (sort.some((item) => item.key === 'ticket_id')) {
    return sort.slice(0, 4);
  }
  return [...sort.slice(0, 3), { key: 'ticket_id', direction: 'asc' }];
}

function normalizeSort(value: string | null): TicketSortValue {
  if (!value) {
    return '';
  }
  if (knownSorts.has(value as TicketSortKey)) {
    return value;
  }
  return serializeColumnSort(parseColumnSort(value));
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

function normalizePage(value: string | null): number {
  if (!value || !/^\d+$/.test(value)) {
    return 1;
  }
  return Math.max(1, Math.min(Number(value), 999));
}

function nullable(value: string): string | null {
  return value === '' ? null : value;
}

function parseColumnSort(value: string): SortInput[] {
  const result: SortInput[] = [];
  const seen = new Set<string>();
  for (const part of value.split(',')) {
    const [rawKey, rawDirection] = part.split('.');
    const key = rawKey?.trim();
    const direction = rawDirection?.trim().toLowerCase();
    if (!knownColumnSorts.has(key as TicketColumnSortKey) || (direction !== 'asc' && direction !== 'desc') || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push({
      key: ticketColumnSortInputs[key as TicketColumnSortKey] as ListTicketsSortKey,
      direction,
    });
  }
  return result.slice(0, 4);
}

function serializeColumnSort(sort: readonly SortInput[]): string {
  return sort.map((item) => `${item.key}.${item.direction ?? 'asc'}`).join(',');
}
