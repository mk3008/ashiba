import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createPostgresPreparedQuerySource, preparePostgresQuery, type AshibaPostgresQuerySource } from '@ashiba-ts/driver-adapter-pg';
import { queries } from '../src/generated/queries.js';
import { assignTicket, getTicket, listTickets, orderTickets } from '../src/tickets.js';
import type { GetParams, Ticket } from '../src/types.js';

const getQuery = createPostgresPreparedQuerySource<GetParams>(queries.get.sql, {
  ...queries.get.postgres,
  sourceHash: queries.get.sourceHash,
});

describe('reference named preparation', () => {
  test('keeps repeated values ordered, rejects missing input, and keeps hostile data out of SQL', async () => {
    expect(queries.list.postgres.orderedNames).toEqual([
      'status', 'status', 'customerId', 'customerId', 'assigneeMode',
      'assigneeMode', 'assigneeMode', 'assigneeId', 'limit', 'offset',
    ]);
    expect(() => preparePostgresQuery(
      getQuery as AshibaPostgresQuerySource<Record<string, unknown>>,
      {},
      { strictParameterNames: true },
    )).toThrow('Missing SQL parameter');

    const hostile = "x'); drop table tickets; --";
    const calls: Array<{ sql: string; values: unknown[] }> = [];
    const pool = {
      query: async (sql: string, values: unknown[]) => {
        calls.push({ sql, values });
        return { rows: [] as Ticket[] };
      },
    } as unknown as Pool;

    await getTicket(pool, hostile);
    expect(calls[0]?.values).toEqual([hostile]);
    expect(calls[0]?.sql).not.toContain(hostile);
  });
});

const url = process.env.DATABASE_URL;
const schema = readFileSync(fileURLToPath(new URL('../db/ddl/schema.sql', import.meta.url)), 'utf8');
const seed = readFileSync(fileURLToPath(new URL('../db/seed.sql', import.meta.url)), 'utf8');

if (!url) {
  describe.skip('live postgres', () => test('requires DATABASE_URL', () => {}));
} else {
  describe('live postgres', () => {
    const pool = new Pool({ connectionString: url });

    beforeAll(async () => {
      await pool.query('drop table if exists ticket_events, tickets cascade');
      await pool.query(schema);
      await pool.query(seed);
    });

    afterAll(async () => pool.end());

    test('implements optional filters, all assignee states, paging, ordering, and get', async () => {
      expect((await listTickets(pool)).map((ticket) => ticket.id)).toEqual(['1', '2', '3', '4', '5']);
      expect((await listTickets(pool, { status: 'closed' })).map((ticket) => ticket.id)).toEqual(['3']);
      expect((await listTickets(pool, { customerId: '10' })).map((ticket) => ticket.id)).toEqual(['1', '2', '5']);
      expect((await listTickets(pool, { assignee: null })).map((ticket) => ticket.id)).toEqual(['1']);
      expect((await listTickets(pool, { assignee: '7' })).map((ticket) => ticket.id)).toEqual(['2', '4', '5']);
      expect((await listTickets(pool, { limit: 1, offset: 1 })).map((ticket) => ticket.id)).toEqual(['2']);
      expect((await listTickets(pool, {
        sort: [{ key: 'priority', direction: 'asc' }, { key: 'createdAt', direction: 'desc' }],
      })).map((ticket) => ticket.id)).toEqual(['4', '2', '5', '1', '3']);
      expect((await getTicket(pool, '1'))?.id).toBe('1');
      expect((await getTicket(pool, '1'))?.created_at).toBeInstanceOf(Date);
    });

    test('permits only static ordering choices and retains the id tie-breaker', () => {
      expect(orderTickets(queries.list.postgres.sql, [
        { key: 'priority', direction: 'asc' },
        { key: 'createdAt', direction: 'desc' },
        { key: 'subject', direction: 'asc' },
      ])).toMatch(/subject asc, t\.id asc/);
      expect(() => orderTickets('select 1', [])).toThrow('stable ticket ordering');
      expect(() => orderTickets(queries.list.postgres.sql, [
        { key: 'priority', direction: 'asc' },
        { key: 'priority', direction: 'desc' },
      ])).toThrow('Duplicate sort key');
      expect(() => orderTickets(queries.list.postgres.sql, [
        { key: 'priority', direction: 'sideways' as 'asc' },
      ])).toThrow('Invalid sort direction');
      expect(() => orderTickets(queries.list.postgres.sql, [
        { key: 'sql' as 'priority', direction: 'asc' },
      ])).toThrow('Invalid sort key');
      expect(() => orderTickets(queries.list.postgres.sql, [
        { key: 'priority', direction: 'asc' },
        { key: 'createdAt', direction: 'asc' },
        { key: 'subject', direction: 'asc' },
        { key: 'priority', direction: 'desc' },
      ])).toThrow('At most three');
    });

    test('rolls assignment back when audit insert fails', async () => {
      await assignTicket(pool, { ticketId: '1', assigneeId: '9', actorId: '1' });
      expect((await getTicket(pool, '1'))?.assignee_id).toBe('9');

      await expect(assignTicket(pool, {
        ticketId: '2',
        assigneeId: '9',
        actorId: '1',
        note: 'x'.repeat(100_000),
      })).rejects.toThrow();
      expect((await getTicket(pool, '2'))?.assignee_id).toBe('7');
    });
  });
}
