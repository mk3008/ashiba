import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const {
  createNativePool,
  listWorkItems,
  normalizeOptions,
  sqlForSort,
} = await import('../index.js');

const testDirectory = path.dirname(fileURLToPath(import.meta.url));

test('requires ownerId and normalizes optional values', () => {
  assert.deepEqual(normalizeOptions({ ownerId: 7 }), {
    ownerId: 7,
    state: null,
    limit: 50,
    sort: 'updatedAt',
  });
  assert.deepEqual(normalizeOptions({ ownerId: 7, state: 'open', limit: 10, sort: 'priority' }), {
    ownerId: 7,
    state: 'open',
    limit: 10,
    sort: 'priority',
  });
  assert.throws(() => normalizeOptions({}), /ownerId is required/);
});

test('maps unknown sort to the reviewed updatedAt asset', () => {
  assert.deepEqual(normalizeOptions({ ownerId: 7, sort: 'title' }).sort, 'updatedAt');
  assert.match(sqlForSort('updatedAt'), /ORDER BY updated_at DESC/);
  assert.match(sqlForSort('priority'), /ORDER BY priority DESC/);
  assert.equal(sqlForSort('title'), sqlForSort('updatedAt'));
});

test('passes named values to the selected application SQL asset', async () => {
  const calls = [];
  const pool = { execute: async (sql, params) => { calls.push({ sql, params }); return [[], []]; } };
  await listWorkItems(pool, { ownerId: 3, state: 'closed', sort: 'priority', limit: 4 });
  assert.equal(calls.length, 1);
  assert.match(calls[0].sql, /WHERE owner_id = :ownerId/);
  assert.deepEqual(calls[0].params, { ownerId: 3, state: 'closed', limit: 4 });
});

test('keeps application SQL in visible assets', () => {
  for (const asset of ['list-work-items-updated-at.sql', 'list-work-items-priority.sql']) {
    const sql = fs.readFileSync(path.join(testDirectory, '..', asset), 'utf8');
    assert.match(sql, /SELECT id, owner_id, title, state, priority, updated_at/);
    assert.doesNotMatch(sql, /\$\{|\+\s*options\./);
  }
});

const mysqlUrl = process.env.MYSQL_URL;
test('executes representative SQL through the native MySQL driver', {
  skip: !mysqlUrl || 'MYSQL_URL is not set',
}, async () => {
  const pool = createNativePool(mysqlUrl);
  try {
    const rows = await listWorkItems(pool, {
      ownerId: Number(process.env.TEST_OWNER_ID || 1),
      state: process.env.TEST_STATE || undefined,
      sort: process.env.TEST_SORT || 'updatedAt',
      limit: 10,
    });
    assert.ok(Array.isArray(rows));
  } finally {
    await pool.end();
  }
});
