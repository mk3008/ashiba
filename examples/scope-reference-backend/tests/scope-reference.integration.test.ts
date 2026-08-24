import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { preparePostgresQuery, type AshibaPostgresQuerySource } from '@ashiba-ts/driver-adapter-pg';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { assignTicket } from '../src/tickets/assign.js';
import { getTicket } from '../src/tickets/get.js';
import { listTickets } from '../src/tickets/list.js';
import { placeTicketOrdering } from '../src/tickets/ordering.js';
import { queryModels } from '../src/tickets/generated/query-models.js';
import { assignTicketSql, getSql, insertEventSql, listSql } from '../src/tickets/generated/sql-text.js';
import type { AssignTicketSqlParams, InsertTicketEventSqlParams, ListTicketsSqlParams, Ticket, TicketIdSqlParams } from '../src/tickets/types.js';

const url = process.env.DATABASE_URL;
const schema = readFileSync(fileURLToPath(new URL('../db/schema.sql', import.meta.url)), 'utf8');
const seed = readFileSync(fileURLToPath(new URL('../db/seed.sql', import.meta.url)), 'utf8');

function query<Params extends object>(sql: string, queryModel: unknown): AshibaPostgresQuerySource<Params> {
  return { sql, queryModel: queryModel as AshibaPostgresQuerySource<Params>['queryModel'] };
}

describe('scope reference backend named preparation', () => {
  test('lowers and binds all canonical SQL with repeated names preserved', () => {
    const list = preparePostgresQuery(query<ListTicketsSqlParams>(listSql, queryModels.list), {
      status: 'open', customerId: '12', assigneeMode: 'assigned', assigneeId: '7', limit: 20, offset: 5,
    }, { strictParameterNames: true });
    const get = preparePostgresQuery(query<TicketIdSqlParams>(getSql, queryModels.get), { id: '1' }, { strictParameterNames: true });
    const assign = preparePostgresQuery(query<AssignTicketSqlParams>(assignTicketSql, queryModels.assignTicket), { assigneeId: '7', ticketId: '1' }, { strictParameterNames: true });
    const event = preparePostgresQuery(query<InsertTicketEventSqlParams>(insertEventSql, queryModels.insertEvent), { ticketId: '1', actorId: '42', note: null }, { strictParameterNames: true });

    expect(list.orderedNames).toEqual(['status', 'status', 'customerId', 'customerId', 'assigneeMode', 'assigneeMode', 'assigneeMode', 'assigneeId', 'limit', 'offset']);
    expect(list.values).toEqual(['open', 'open', '12', '12', 'assigned', 'assigned', 'assigned', '7', 20, 5]);
    expect(get.values).toEqual(['1']);
    expect(assign.values).toEqual(['7', '1']);
    expect(event.values).toEqual(['1', '42', null]);
    for (const prepared of [list, get, assign, event]) expect(prepared.sql).not.toMatch(/:[A-Za-z_]/);
  });

  test('rejects a missing parameter and keeps hostile values separate at the native pg boundary', async () => {
    expect(() => preparePostgresQuery(query<TicketIdSqlParams>(getSql, queryModels.get), {} as TicketIdSqlParams, { strictParameterNames: true })).toThrow('Missing SQL parameter');
    const hostile = "x' ); drop table tickets; --";
    const calls: Array<{ sql: string; values: unknown[] }> = [];
    const pool = { query: async (sql: string, values: unknown[]) => {
      calls.push({ sql, values });
      return { rows: [] as Ticket[] };
    } } as unknown as Pool;

    await getTicket(pool, hostile);
    expect(calls).toEqual([{ sql: 'select id, customer_id, subject, status, priority, assignee_id, created_at, updated_at\nfrom tickets where id = $1;\n', values: [hostile] }]);
    expect(calls[0]?.sql).not.toContain(hostile);
  });
});

if (!url) {
  describe.skip('scope reference backend (PostgreSQL)', () => test('requires DATABASE_URL', () => {}));
} else describe('scope reference backend (PostgreSQL)', () => {
  const pool = new Pool({ connectionString: url });
  beforeAll(async () => { await pool.query('drop table if exists ticket_events, tickets cascade'); await pool.query(schema); await pool.query(seed); });
  afterAll(async () => { await pool.end(); });
  test('list owns all three assignee meanings and CASE ordering', async () => {
    const tickets = await listTickets(pool);
    expect(tickets.map((t) => t.id)).toEqual(['1', '2', '3', '4']);
    expect(typeof tickets[0].id).toBe('string');
    expect(typeof tickets[0].customer_id).toBe('string');
    expect(tickets[0].created_at).toBeInstanceOf(Date);
    const unassigned = await listTickets(pool, { assignee: null });
    expect(unassigned.map((t) => t.id)).toEqual(['1']);
    expect(unassigned[0].assignee_id).toBeNull();
    const assigned = await listTickets(pool, { assignee: '7' });
    expect(assigned.map((t) => t.id)).toEqual(['2', '4']);
    expect(typeof assigned[0].assignee_id).toBe('string');
    expect((await listTickets(pool, { sort: [{ key: 'priority', direction: 'asc' }, { key: 'createdAt', direction: 'desc' }] })).map((t) => t.id)).toEqual(['4', '1', '2', '3']);
    await expect(listTickets(pool, { sort: [{ key: 'bad' as never, direction: 'asc' }] })).rejects.toThrow('Invalid sort key');
    await expect(listTickets(pool, { sort: [{ key: 'subject', direction: 'sideways' as never }] })).rejects.toThrow('Invalid sort direction');
    expect(() => placeTicketOrdering('select 1 order by t.id asc', [
      { key: 'subject', direction: 'asc' }, { key: 'subject', direction: 'desc' },
    ])).toThrow('Duplicate sort key');
    expect(() => placeTicketOrdering('select 1 order by t.id asc', [
      { key: 'priority', direction: 'asc' }, { key: 'createdAt', direction: 'asc' },
      { key: 'subject', direction: 'asc' }, { key: 'priority', direction: 'desc' },
    ])).toThrow('At most three');
    expect(() => placeTicketOrdering('select 1', [])).toThrow('Expected stable ticket ordering');
  });
  test('gets existing and missing tickets', async () => { expect((await getTicket(pool, '1'))?.subject).toBe('Cannot sign in'); expect(await getTicket(pool, '999')).toBeUndefined(); });
  test('assigns with an audit event and rolls back on event failure', async () => {
    await assignTicket(pool, { ticketId: '1', assigneeId: '9', actorId: '42', note: 'triaged' });
    expect((await getTicket(pool, '1'))?.assignee_id).toBe('9');
    expect((await pool.query('select event_type from ticket_events where ticket_id = 1')).rows).toEqual([{ event_type: 'assigned' }]);
    await expect(assignTicket(pool, { ticketId: '2', assigneeId: '9', actorId: '42', note: 'x'.repeat(10_000) })).rejects.toThrow();
    expect((await getTicket(pool, '2'))?.assignee_id).toBe('7');
  });
});
