import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

import { listWorkItems, createPool } from '../index.js';

function fakePool(result = []) {
  const calls = [];
  return {
    calls,
    query: async (sql, params) => {
      calls.push({ sql, params });
      return [result, []];
    },
  };
}

test('requires ownerId and binds the optional state by name', async () => {
  const pool = fakePool([{ id: 1 }]);

  const rows = await listWorkItems(pool, { ownerId: 7, state: 'open' });

  assert.deepEqual(rows, [{ id: 1 }]);
  assert.equal(pool.calls[0].params.ownerId, 7);
  assert.equal(pool.calls[0].params.state, 'open');
  assert.equal(pool.calls[0].params.limit, 100);
  assert.match(pool.calls[0].sql, /ORDER BY updated_at DESC, id DESC/);
  assert.match(pool.calls[0].sql, /:ownerId/);
  assert.match(pool.calls[0].sql, /:state/);
  assert.match(pool.calls[0].sql, /:limit/);
});

test('uses the priority asset and supplied limit', async () => {
  const pool = fakePool();

  await listWorkItems(pool, { ownerId: 3, sort: 'priority', limit: 25 });

  assert.equal(pool.calls[0].params.state, null);
  assert.equal(pool.calls[0].params.limit, 25);
  assert.match(pool.calls[0].sql, /ORDER BY priority DESC, updated_at DESC, id DESC/);
});

test('maps an unknown sort to the safe updatedAt asset', async () => {
  const pool = fakePool();

  await listWorkItems(pool, { ownerId: 3, sort: 'toString' });

  assert.match(pool.calls[0].sql, /ORDER BY updated_at DESC, id DESC/);
  assert.equal(typeof pool.calls[0].sql, 'string');
});

test('rejects missing ownerId and invalid values before executing SQL', async () => {
  const pool = fakePool();

  await assert.rejects(() => listWorkItems(pool, {}), /ownerId is required/);
  await assert.rejects(() => listWorkItems(pool, { ownerId: 1, state: 'pending' }), /state/);
  await assert.rejects(() => listWorkItems(pool, { ownerId: 1, limit: 0 }), /limit/);
  assert.equal(pool.calls.length, 0);
});

test('keeps both application queries visible as SQL assets', () => {
  for (const name of ['list_work_items_updated_at.sql', 'list_work_items_priority.sql']) {
    const sql = readFileSync(path.join(import.meta.dirname, '..', 'sql', name), 'utf8');
    assert.match(sql, /SELECT[\s\S]+FROM work_items/);
  }
});

const dbTest = process.env.RUN_DB_TESTS === '1' ? test : test.skip;

dbTest('executes the application SQL through mysql2 when enabled', async () => {
  const pool = createPool();
  try {
    const rows = await listWorkItems(pool, { ownerId: 1, sort: 'updatedAt', limit: 10 });
    assert.ok(Array.isArray(rows));
  } finally {
    await pool.end();
  }
});
