import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import mysql from 'mysql2/promise';
import { listWorkItems, normalizeFilters } from '../list-work-items.js';

const seedSql = readFileSync(new URL('../sql/insert-test-work-items.sql', import.meta.url), 'utf8');

const config = {
  host: process.env.RAW_SQL_RULES_HOST || '127.0.0.1',
  port: Number(process.env.RAW_SQL_RULES_PORT || 33306),
  user: process.env.RAW_SQL_RULES_USER || 'raw_sql_rules',
  password: process.env.RAW_SQL_RULES_PASSWORD || 'raw_sql_rules',
  database: process.env.RAW_SQL_RULES_DATABASE || 'raw_sql_rules',
  namedPlaceholders: true,
  dateStrings: false,
};

test('lists an owner by state and priority through mysql2', async (t) => {
  const connection = await mysql.createConnection(config);
  const ownerId = 700000 + process.pid;
  t.after(async () => connection.end());
  await connection.beginTransaction();
  try {
    await connection.execute(seedSql, {
      ownerId,
      lowTitle: 'low',
      openState: 'open',
      lowPriority: 1,
      lowUpdatedAt: '2026-01-01 10:00:00',
      highTitle: 'high',
      highPriority: 9,
      highUpdatedAt: '2026-01-01 09:00:00',
    });
    const rows = await listWorkItems(connection, { ownerId, state: 'open', sort: 'priority', limit: 1 });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].title, 'high');
    assert.equal(rows[0].ownerId, ownerId);
    assert.ok(rows[0].updatedAt instanceof Date, 'mysql2 should map DATETIME to Date');
  } finally {
    await connection.rollback();
  }
});

test('unknown sort uses the reviewed updatedAt asset', () => {
  assert.equal(normalizeFilters({ ownerId: 1, sort: 'drop table work_items' }).sort, 'updatedAt');
});

test('ownerId is required', () => {
  assert.throws(() => normalizeFilters({}), /ownerId is required/);
});
