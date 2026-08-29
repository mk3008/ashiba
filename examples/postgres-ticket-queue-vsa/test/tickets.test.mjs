import assert from 'node:assert/strict';
import { bindNamedParameters, NamedParameterError } from '@ashiba-ts/named-parameters';
import { bindingMetadata as list } from '../src/tickets/generated/list-subject-asc.mjs';
import { listTickets, getTicketById, assignTicketWithAudit } from '../src/tickets/query/ticketQueries.mjs';

class FakeClient {
  constructor() { this.calls = []; this.released = false; }
  async query(text, values) {
    this.calls.push({ text, values });
    if (text === 'BEGIN' || text === 'COMMIT' || text === 'ROLLBACK') return { rows: [], rowCount: 0 };
    if (text.includes('update tickets')) return { rows: [{ id: 7, assignee_id: 42 }], rowCount: 1 };
    return { rows: [{ id: 11 }], rowCount: 1 };
  }
  release() { this.released = true; }
}

class FakePool {
  constructor() { this.client = new FakeClient(); }
  async connect() { return this.client; }
}

const queryLog = [];
const fakeQueryClient = { query: async (text, values) => { queryLog.push({ text, values }); return { rows: [] }; } };

listTickets(fakeQueryClient, { status: "open'; drop table tickets; --", assigneeId: null, limit: 5, offset: 10, sortKey: 'subject', sortDirection: 'asc' });
assert.equal(queryLog[0].text.includes("drop table"), false);
assert.deepEqual(queryLog[0].values, ["open'; drop table tickets; --", null, 5, 10]);
assert.match(queryLog[0].text, /order by t\.subject asc, t\.id asc/);
assert.throws(() => listTickets(fakeQueryClient, { sortKey: 'createdAt', sortDirection: 'sideways' }), RangeError);
assert.throws(() => listTickets(fakeQueryClient, { limit: -1 }), TypeError);

const getLog = [];
await getTicketById({ query: async (text, values) => { getLog.push({ text, values }); return { rows: [] }; } }, 12);
assert.deepEqual(getLog[0].values, [12]);

assert.throws(() => bindNamedParameters(list.bindings.postgres, { status: 'open', assigneeId: null, limit: 1 }), (error) => error instanceof NamedParameterError && error.code === 'ASHIBA_MISSING_PARAMETER');
assert.throws(() => bindNamedParameters(list.bindings.postgres, { status: null, assigneeId: null, limit: 1, offset: 0, extra: true }), (error) => error instanceof NamedParameterError && error.code === 'ASHIBA_UNUSED_PARAMETER');

const successPool = new FakePool();
const assigned = await assignTicketWithAudit(successPool, 7, 42);
assert.equal(assigned.id, 7);
assert.deepEqual(successPool.client.calls.map(({ text }) => text === 'BEGIN' || text === 'COMMIT' || text === 'ROLLBACK' ? text : text.includes('update tickets') ? 'UPDATE' : text.includes('insert into ticket_events') ? 'AUDIT' : 'OTHER'), ['BEGIN', 'UPDATE', 'AUDIT', 'COMMIT']);
assert.deepEqual(successPool.client.calls[1].values, [42, 7]);
assert.deepEqual(successPool.client.calls[2].values, [7, 'assigned']);
assert.equal(successPool.client.released, true);

const rollbackPool = new FakePool();
await assert.rejects(() => assignTicketWithAudit(rollbackPool, 7, 42, { auditFailure: true }), /injected audit failure/);
assert.deepEqual(rollbackPool.client.calls.map(({ text }) => text === 'BEGIN' || text === 'COMMIT' || text === 'ROLLBACK' ? text : text.includes('update tickets') ? 'UPDATE' : text.includes('insert into ticket_events') ? 'AUDIT' : 'OTHER'), ['BEGIN', 'UPDATE', 'AUDIT', 'ROLLBACK']);
assert.equal(rollbackPool.client.released, true);

console.log('ticket tests: PASS');
