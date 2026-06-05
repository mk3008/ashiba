import { describe, expect, test } from 'vitest';

import { parseTicketFilters, toListTicketsParams, toTicketSort } from './request.js';

describe('support inbox request parsing', () => {
  test('maps empty filter values to null SQL params', () => {
    const filters = parseTicketFilters(new URL('http://localhost/tickets'));

    expect(toListTicketsParams(filters)).toEqual({
      status: null,
      customerTier: null,
      slaState: null,
      language: null,
      channel: null,
      tag: null,
      keyword: null,
      limit: 50,
      offset: 0,
    });
  });

  test('maps public sort choice to reviewed safe sort keys', () => {
    const filters = parseTicketFilters(new URL('http://localhost/tickets?sort=vip-first'));

    expect(toTicketSort(filters)).toEqual([
      { key: 'vip_rank', direction: 'asc' },
      { key: 'updated_at', direction: 'desc' },
    ]);
  });
});
