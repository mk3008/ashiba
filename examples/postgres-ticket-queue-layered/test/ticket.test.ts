import assert from 'node:assert/strict';
import test from 'node:test';
import { bindNamedParameters, NamedParameterError } from '@ashiba-ts/named-parameters';
import { queryBindings } from '../src/access/queryBindings.js';
import { TicketService } from '../src/application/ticketService.js';
import { SqlTicketAccess, type AssignRow, type TicketAccess, type TicketRow } from '../src/access/ticketAccess.js';
import type { QueryExecutor, QueryResult, TransactionClient, TransactionPool } from '../src/access/pgTypes.js';

const row: TicketRow = {
  id: '7', subject: 'Printer', status: 'open', assignee_id: null,
  created_at: new Date('2026-01-01T00:00:00Z'), audit_count: 2,
  latest_event_kind: 'assigned', latest_event_at: new Date('2026-01-02T00:00:00Z'),
};

class RecordingExecutor implements QueryExecutor {
  calls: Array<{ sql: string; values: unknown[] }> = [];
  async query<Row>(sql: string, values: unknown[] = []): Promise<QueryResult<Row>> {
    this.calls.push({ sql, values });
    return { rows: [row as unknown as Row], rowCount: 1 };
  }
}

class FakeClient extends RecordingExecutor implements TransactionClient {
  released = false;
  release(): void { this.released = true; }
}

class FakePool extends RecordingExecutor implements TransactionPool {
  client = new FakeClient();
  async connect(): Promise<TransactionClient> { return this.client; }
}

test('SQL access binds hostile values and keeps SQL text independent of them', async () => {
  const executor = new RecordingExecutor();
  const access = new SqlTicketAccess();
  await access.list(executor, { status: "open' OR 1=1 --", assigneeId: null, limit: 10, offset: 4 }, 't.subject DESC, t.id ASC');
  const call = executor.calls[0];
  assert.ok(call.sql.includes('$1'));
  assert.ok(!call.sql.includes("open' OR 1=1"));
  assert.deepEqual(call.values, ["open' OR 1=1 --", null, 10, 4]);
  assert.match(call.sql, /ORDER BY t\.subject DESC, t\.id ASC/);
  assert.ok(!call.sql.includes('SORT_ORDER'));
});

test('get access binds the id and returns the joined audit projection', async () => {
  const executor = new RecordingExecutor();
  const result = await new SqlTicketAccess().get(executor, '7');
  assert.equal(result?.audit_count, 2);
  assert.match(executor.calls[0].sql, /WHERE t\.id = \$1/);
  assert.deepEqual(executor.calls[0].values, ['7']);
});

test('binder rejects missing and unused names', () => {
  const statement = queryBindings.list;
  assert.throws(() => bindNamedParameters(statement, { status: 'open' }), (error: unknown) =>
    error instanceof NamedParameterError && error.code === 'ASHIBA_MISSING_PARAMETER');
  assert.throws(() => bindNamedParameters(statement, {
    status: null, assigneeId: null, sortField: 'createdAt', sortDirection: 'asc', limit: 1, offset: 0, extra: true,
  }), (error: unknown) => error instanceof NamedParameterError && error.code === 'ASHIBA_UNUSED_PARAMETER');
});

test('service owns mapping and finite sort/filter/paging options', async () => {
  const pool = new FakePool();
  const access = new SqlTicketAccess();
  const service = new TicketService(pool, access);
  const tickets = await service.list({ status: 'open', assigneeId: '12', sortField: 'subject', sortDirection: 'asc', limit: 2, offset: 1 });
  assert.equal(tickets[0].assigneeId, null);
  assert.equal(tickets[0].auditCount, 2);
  await assert.rejects(() => service.list({ sortField: 'subject; DROP TABLE tickets' } as never), /unsupported sort field/);
  await assert.rejects(() => service.list({ sortDirection: 'desc; DROP TABLE tickets' } as never), /unsupported sort direction/);
  await assert.rejects(() => service.list({ limit: 101 }), /at most 100/);
});

test('each accepted sort pair selects only its reviewed ORDER BY literal', async () => {
  const pool = new FakePool();
  const service = new TicketService(pool, new SqlTicketAccess());
  const cases = [
    ['createdAt', 'asc', 't.created_at ASC, t.id ASC'],
    ['createdAt', 'desc', 't.created_at DESC, t.id ASC'],
    ['subject', 'asc', 't.subject ASC, t.id ASC'],
    ['subject', 'desc', 't.subject DESC, t.id ASC'],
  ] as const;
  for (const [sortField, sortDirection, orderBy] of cases) {
    await service.list({ sortField, sortDirection });
    assert.match(pool.calls.at(-1)?.sql ?? '', new RegExp(`ORDER BY ${orderBy.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  }
});

test('assign writes audit in one native transaction and rolls back injected audit errors', async () => {
  const pool = new FakePool();
  const assigned: AssignRow = { id: '7', subject: 'Printer', status: 'open', assignee_id: '42', created_at: row.created_at };
  let failAudit = true;
  const access: TicketAccess = {
    async list() { return []; },
    async get() { return failAudit ? row : { ...row, assignee_id: '42' }; },
    async assign() { return assigned; },
    async addEvent() { if (failAudit) throw new Error('injected audit error'); },
  };
  const service = new TicketService(pool, access);
  await assert.rejects(() => service.assign('7', '42'), /injected audit error/);
  assert.deepEqual(pool.client.calls.map((call) => call.sql), ['BEGIN', 'ROLLBACK']);
  assert.equal(pool.client.released, true);
  failAudit = false;
  const result = await service.assign('7', '42');
  assert.equal(result?.assigneeId, '42');
  assert.equal(result?.auditCount, 2);
  assert.deepEqual(pool.client.calls.map((call) => call.sql), ['BEGIN', 'ROLLBACK', 'BEGIN', 'COMMIT']);
});
