import { describe, expect, test } from 'vitest';

import { parseTicketFilters, toListTicketsParams, toTicketSort } from './tickets.request.js';

describe('support inbox request parsing', () => {
  test('maps empty filter values to null SQL params', () => {
    const filters = parseTicketFilters(new URL('http://localhost/tickets'));

    expect(filters.sort).toBe('');
    expect(filters.page).toBe(1);
    expect(toListTicketsParams(filters)).toEqual({
      status: null,
      customerTier: null,
      slaState: null,
      language: null,
      channel: null,
      tag: null,
      keyword: null,
      limit: 10,
      offset: 0,
    });
    expect(toTicketSort(filters)).toEqual([]);
  });

  test('maps page to a ten row offset', () => {
    const filters = parseTicketFilters(new URL('http://localhost/tickets?page=3'));

    expect(filters.page).toBe(3);
    expect(toListTicketsParams(filters)).toMatchObject({
      limit: 10,
      offset: 20,
    });
  });

  test('maps public sort choice to reviewed safe sort keys', () => {
    const filters = parseTicketFilters(new URL('http://localhost/tickets?sort=vip-first'));

    expect(toTicketSort(filters)).toEqual([
      { key: 'vip_rank', direction: 'asc' },
      { key: 'updated_at', direction: 'desc' },
    ]);
  });

  test('maps header column sort choices to reviewed safe sort keys', () => {
    const filters = parseTicketFilters(new URL('http://localhost/tickets?sort=customer_name.asc,updated_at.desc'));

    expect(filters.sort).toBe('customer_name.asc,updated_at.desc');
    expect(toTicketSort(filters)).toEqual([
      { key: 'customer_name', direction: 'asc' },
      { key: 'updated_at', direction: 'desc' },
    ]);
  });

  test('drops unknown header sort keys before executing SQL', () => {
    const filters = parseTicketFilters(new URL('http://localhost/tickets?sort=customer_name.asc,unsafe_sql.desc,status.sideways,updated_at.desc'));

    expect(filters.sort).toBe('customer_name.asc,updated_at.desc');
    expect(toTicketSort(filters)).toEqual([
      { key: 'customer_name', direction: 'asc' },
      { key: 'updated_at', direction: 'desc' },
    ]);
  });
});
