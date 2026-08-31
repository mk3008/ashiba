'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { listWorkItems } = require('./list-work-items');

function fakeDb() {
  const calls = [];
  return {
    calls,
    async execute(sql, params) {
      calls.push({ sql, params });
      return [[{ id: 1 }], []];
    },
  };
}

test('requires ownerId and binds the optional state and limit', async () => {
  const db = fakeDb();
  const rows = await listWorkItems({ db, ownerId: 42, state: 'open', sort: 'updatedAt', limit: 10 });

  assert.deepEqual(rows, [{ id: 1 }]);
  assert.equal(db.calls.length, 1);
  assert.deepEqual(db.calls[0].params, [42, 'open', 'open', 10]);
  assert.match(db.calls[0].sql, /ORDER BY updated_at DESC/);
  assert.doesNotMatch(db.calls[0].sql, /42|open/);
});

test('selects the reviewed priority SQL asset and uses a bound no-limit value', async () => {
  const db = fakeDb();
  await listWorkItems({ db, ownerId: 7, sort: 'priority' });

  assert.match(db.calls[0].sql, /ORDER BY priority DESC/);
  assert.deepEqual(db.calls[0].params, [7, null, null, 2147483647]);
});

test('rejects an unknown sort before invoking the driver', async () => {
  const db = fakeDb();
  await assert.rejects(
    () => listWorkItems({ db, ownerId: 1, sort: 'title' }),
    /sort must be "updatedAt" or "priority"/,
  );
  assert.equal(db.calls.length, 0);
});

test('rejects a missing ownerId and invalid limit', async () => {
  const db = fakeDb();
  await assert.rejects(() => listWorkItems({ db }), /ownerId is required/);
  await assert.rejects(() => listWorkItems({ db, ownerId: 1, limit: 0 }), /positive integer/);
  assert.equal(db.calls.length, 0);
});
