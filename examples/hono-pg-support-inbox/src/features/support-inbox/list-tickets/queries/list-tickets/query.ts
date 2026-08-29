import { queryMany, type FeatureQuerySource } from '#features/_shared/featureQueryExecutor.js';
import type { FeatureQueryExecutor } from '#features/_shared/featureQueryExecutor.js';
import { bindingMetadata } from './generated/query.meta.js';
import { querySql } from './generated/query.sql.js';

export const listTicketsSql = querySql;
export const listTicketsQuery: FeatureQuerySource<ListTicketsQueryParams, ListTicketsQueryResult> = {
  id: 'list-tickets',
  path: 'list-tickets.sql',
  sqlPath: 'list-tickets.sql',
  sql: listTicketsSql,
  binding: bindingMetadata.bindings.postgres,
  metadata: {
    sqlId: 'list-tickets',
    queryId: 'list-tickets',
    sqlFile: 'list-tickets.sql',
    sqlPath: 'list-tickets.sql',
  },
};

export const listTicketsSortTerms = {
  ticket_id: { asc: 'st.ticket_id asc', desc: 'st.ticket_id desc' },
  subject: { asc: 'cast(st.subject as text) asc', desc: 'cast(st.subject as text) desc' },
  customer_name: { asc: 'cast(st.customer_name as text) asc', desc: 'cast(st.customer_name as text) desc' },
  customer_tier: { asc: 'cast(st.customer_tier as text) asc', desc: 'cast(st.customer_tier as text) desc' },
  status: { asc: 'cast(st.status as text) asc', desc: 'cast(st.status as text) desc' },
  priority_rank: { asc: 'st.priority_rank asc', desc: 'st.priority_rank desc' },
  sla_due_at: { asc: 'st.sla_due_at asc', desc: 'st.sla_due_at desc' },
  sla_state: { asc: 'cast(st.sla_state as text) asc', desc: 'cast(st.sla_state as text) desc' },
  latest_message_at: { asc: 'st.latest_message_at asc', desc: 'st.latest_message_at desc' },
  language: { asc: 'cast(st.language as text) asc', desc: 'cast(st.language as text) desc' },
  channel: { asc: 'cast(st.channel as text) asc', desc: 'cast(st.channel as text) desc' },
  updated_at: { asc: 'st.updated_at asc', desc: 'st.updated_at desc' },
  action_required: { asc: 'st.action_required asc', desc: 'st.action_required desc' },
  last_customer_reply_at: { asc: 'lcr.last_customer_reply_at asc', desc: 'lcr.last_customer_reply_at desc' },
  vip_rank: { asc: 'st.vip_rank asc', desc: 'st.vip_rank desc' },
} as const;

export type ListTicketsSortKey = keyof typeof listTicketsSortTerms;
export type ListTicketsSort = { key: ListTicketsSortKey; direction: 'asc' | 'desc' };

const stableOrderBy = 'order by\n    st.ticket_id asc';

export interface ListTicketsQueryParams {
  tag: string | null;
  status: string | null;
  customerTier: string | null;
  slaState: string | null;
  language: string | null;
  channel: string | null;
  keyword: unknown;
  limit: number;
  offset: number;
}

export interface ListTicketsQueryResult {
  action_required: number | null;
  channel: string | null;
  created_at: string | null;
  customer_name: string | null;
  customer_tier: string | null;
  language: string | null;
  last_customer_reply_at: string | null;
  latest_message_at: string | null;
  latest_message_body: string | null;
  latest_sender_name: string | null;
  latest_sender_role: string | null;
  priority: string | null;
  priority_rank: number | null;
  sla_due_at: string | null;
  sla_state: string | null;
  status: string | null;
  subject: string | null;
  tag_slugs: string[] | null;
  ticket_id: string | null;
  total_count: string;
  updated_at: string | null;
  vip_rank: number | null;
}

export async function executeListTicketsQuery(
  executor: FeatureQueryExecutor,
  params: ListTicketsQueryParams,
  sort: readonly ListTicketsSort[] = [],
): Promise<ListTicketsQueryResult[]> {
  return queryMany(executor, composeListTicketsQuery(sort), params);
}

export function composeListTicketsQuery(sort: readonly ListTicketsSort[]): FeatureQuerySource<ListTicketsQueryParams, ListTicketsQueryResult> {
  const orderBy = renderOrderBy(sort);
  return {
    ...listTicketsQuery,
    sql: replaceStableOrder(listTicketsQuery.sql, orderBy),
    binding: {
      ...listTicketsQuery.binding,
      sql: replaceStableOrder(listTicketsQuery.binding.sql, orderBy),
    },
  };
}

function renderOrderBy(sort: readonly ListTicketsSort[]): string {
  if (sort.length > 4) {
    throw new Error('Support Inbox accepts at most four reviewed sort terms including ticket_id.');
  }

  const seen = new Set<ListTicketsSortKey>();
  const terms = sort.map(({ key, direction }) => {
    if (!Object.hasOwn(listTicketsSortTerms, key)) {
      throw new Error(`Unsupported Support Inbox sort key: ${key}`);
    }
    if (direction !== 'asc' && direction !== 'desc') {
      throw new Error(`Unsupported Support Inbox sort direction: ${direction}`);
    }
    if (seen.has(key)) {
      throw new Error(`Duplicate Support Inbox sort key: ${key}`);
    }
    seen.add(key);
    return listTicketsSortTerms[key][direction];
  });

  if (!seen.has('ticket_id')) {
    if (terms.length === 4) {
      throw new Error('Support Inbox accepts at most four reviewed sort terms including ticket_id.');
    }
    terms.push('st.ticket_id asc');
  }

  return ['order by', ...terms.map((term, index) => `    ${index === 0 ? '' : ', '}${term}`)].join('\n');
}

function replaceStableOrder(sql: string, orderBy: string): string {
  if (!sql.includes(stableOrderBy)) {
    throw new Error('List tickets SQL is missing its stable ORDER BY anchor.');
  }
  return sql.replace(stableOrderBy, orderBy);
}
