import assert from 'node:assert/strict';
import test from 'node:test';

import { listWorkItems } from '../list-work-items.js';

function fakeConnection() {
  const calls = [];
  return {
    calls,
    async execute(sql, params) {
      calls.push({ sql, params });
      return [[{ id: 1, ownerId: params.ownerId }], []];
    },
  };
}

test('requires ownerId and binds optional state and limit by name', async () => {
  const connection = fakeConnection();
  const rows = await listWorkItems(connection, {
    ownerId: 7,
    state: 'open',
    sort: 'priority',
    limit: 10,
  });

  assert.deepEqual(rows, [{ id: 1, ownerId: 7 }]);
  assert.equal(connection.calls.length, 1);
  assert.match(connection.calls[0].sql, /ORDER BY priority DESC/);
  assert.match(connection.calls[0].sql, /LIMIT :limit/);
  assert.deepEqual(connection.calls[0].params, { ownerId: 7, state: 'open', limit: '10' });
});

test('uses the unlimited asset when limit is omitted', async () => {
  const connection = fakeConnection();
  await listWorkItems(connection, { ownerId: 7, sort: 'updatedAt' });

  assert.doesNotMatch(connection.calls[0].sql, /LIMIT/);
  assert.deepEqual(connection.calls[0].params, { ownerId: 7, state: null });
});

test('maps an unknown sort to the safe updatedAt asset', async () => {
  for (const sort of ['toString', 'title; DROP TABLE work_items']) {
    const connection = fakeConnection();
    await listWorkItems(connection, { ownerId: 7, sort });

    assert.match(connection.calls[0].sql, /ORDER BY updated_at DESC/);
    assert.doesNotMatch(connection.calls[0].sql, /DROP TABLE/);
  }
});

test('rejects invalid ownerId, state, and limit', async () => {
  const connection = fakeConnection();
  await assert.rejects(() => listWorkItems(connection, {}), /ownerId/);
  await assert.rejects(() => listWorkItems(connection, { ownerId: 1, state: 'pending' }), /state/);
  await assert.rejects(() => listWorkItems(connection, { ownerId: 1, limit: 0 }), /limit/);
  assert.equal(connection.calls.length, 0);
});
