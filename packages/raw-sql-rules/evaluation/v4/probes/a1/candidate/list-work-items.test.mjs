import assert from 'node:assert/strict';
import test from 'node:test';
import { listWorkItems, sqlAssets } from './list-work-items.mjs';

function connectionReturning(rows = []) {
  const calls = [];
  return {
    calls,
    async execute(sql, params) {
      calls.push({ sql, params });
      return [rows, []];
    },
  };
}

test('requires ownerId before reaching the driver', async () => {
  const connection = connectionReturning();
  await assert.rejects(() => listWorkItems(connection, {}), /ownerId is required/);
  assert.equal(connection.calls.length, 0);
});

test('binds the required owner and optional state/limit through native execute', async () => {
  const connection = connectionReturning([{ id: 1 }]);
  const rows = await listWorkItems(connection, { ownerId: 7, state: 'open', limit: 20, sort: 'priority' });
  assert.deepEqual(rows, [{ id: 1 }]);
  assert.equal(connection.calls.length, 1);
  assert.match(connection.calls[0].sql, /LIMIT :limit/);
  assert.deepEqual(connection.calls[0].params, { ownerId: 7, state: 'open', sort: 'priority', limit: 20 });
});

test('uses the unlimited reviewed SQL asset when limit is omitted', async () => {
  const connection = connectionReturning();
  await listWorkItems(connection, { ownerId: 7 });
  assert.equal(connection.calls[0].sql, sqlAssets.unlimited);
  assert.deepEqual(connection.calls[0].params, { ownerId: 7, state: null, sort: 'updatedAt' });
});

test('maps unknown sort values to updatedAt', async () => {
  const connection = connectionReturning();
  await listWorkItems(connection, { ownerId: 7, sort: 'drop table work_items' });
  assert.equal(connection.calls[0].params.sort, 'updatedAt');
  assert.doesNotMatch(connection.calls[0].sql, /drop table/i);
});

test('rejects invalid state and limit values', async () => {
  await assert.rejects(() => listWorkItems(connectionReturning(), { ownerId: 7, state: 'pending' }), /state must/);
  await assert.rejects(() => listWorkItems(connectionReturning(), { ownerId: 7, limit: 0 }), /limit must/);
});
