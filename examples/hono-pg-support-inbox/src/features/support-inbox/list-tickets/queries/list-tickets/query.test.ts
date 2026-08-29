import { describe, expect, test } from 'vitest';

import { composeListTicketsQuery } from './query.js';

describe('list tickets reviewed finite sort composition', () => {
  test('renders reviewed terms in requested precedence and keeps the stable ticket-id suffix', () => {
    const query = composeListTicketsQuery([
      { key: 'customer_name', direction: 'asc' },
      { key: 'updated_at', direction: 'desc' },
    ]);

    expect(query.sql).toContain('order by\n    cast(st.customer_name as text) asc\n    , st.updated_at desc\n    , st.ticket_id asc');
    expect(query.binding.sql).toContain('order by\n    cast(st.customer_name as text) asc\n    , st.updated_at desc\n    , st.ticket_id asc');
    expect(query.binding.parameterNames).not.toContain('sort_1');
  });

  test('uses the stable ticket-id order when no optional sort is selected', () => {
    const query = composeListTicketsQuery([]);

    expect(query.binding.sql).toContain('order by\n    st.ticket_id asc\nlimit');
    expect(query.binding.sql).not.toContain('order by\n    , st.ticket_id asc');
  });

  test.each([
    [[{ key: 'unsafe_sql' as never, direction: 'asc' }], /Unsupported Support Inbox sort key/],
    [[{ key: 'subject', direction: 'sideways' as never }], /Unsupported Support Inbox sort direction/],
    [[{ key: 'subject', direction: 'asc' }, { key: 'subject', direction: 'desc' }], /Duplicate Support Inbox sort key/],
    [[{ key: 'ticket_id', direction: 'asc' }, { key: 'subject', direction: 'asc' }, { key: 'status', direction: 'asc' }, { key: 'channel', direction: 'asc' }, { key: 'updated_at', direction: 'asc' }], /at most four reviewed sort terms/],
    [[{ key: 'subject', direction: 'asc' }, { key: 'status', direction: 'asc' }, { key: 'channel', direction: 'asc' }, { key: 'updated_at', direction: 'asc' }], /including ticket_id/],
  ])('rejects values outside the closed reviewed sort set', (sort, error) => {
    expect(() => composeListTicketsQuery(sort as any)).toThrow(error);
  });
});
