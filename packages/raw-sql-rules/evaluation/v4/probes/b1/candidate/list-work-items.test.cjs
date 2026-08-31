'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const mysql = require('mysql2/promise');
const { listWorkItems, normalizeOptions } = require('./list-work-items.cjs');

test('validates the required owner and optional values', () => {
  assert.throws(() => normalizeOptions({}), /ownerId is required/);
  assert.deepEqual(normalizeOptions({ ownerId: 7 }), {
    ownerId: 7,
    state: null,
    limit: null,
    sort: 'updatedAt',
  });
  assert.equal(normalizeOptions({ ownerId: 7, sort: 'unexpected' }).sort, 'updatedAt');
  assert.equal(normalizeOptions({ ownerId: 7, sort: 'priority' }).sort, 'priority');
});

test('uses only reviewed SQL assets and binds values', async () => {
  const calls = [];
  const connection = {
    async execute(sql, params) {
      calls.push({ sql, params });
      return [[{ id: 1 }]];
    },
    async query(sql, params) {
      calls.push({ sql, params });
      return [[{ id: 1 }]];
    },
  };

  const rows = await listWorkItems(connection, {
    ownerId: 7,
    state: 'open',
    sort: 'priority',
    limit: 2,
  });

  assert.deepEqual(rows, [{ id: 1 }]);
  assert.match(calls[0].sql, /ORDER BY priority DESC/);
  assert.match(calls[0].sql, /LIMIT :limit/);
  assert.deepEqual(calls[0].params, { ownerId: 7, state: 'open', limit: 2 });
  assert.equal(calls[0].sql.includes('unexpected'), false);
});

test('executes representative assets through the native mysql2 driver', async (t) => {
  const url = process.env.MYSQL_URL || 'mysql://raw_sql_rules:raw_sql_rules@127.0.0.1:33306/raw_sql_rules';
  const connection = await mysql.createConnection({ uri: url, namedPlaceholders: true });

  try {
    await connection.execute(`
      CREATE TEMPORARY TABLE work_items (
        id INT PRIMARY KEY AUTO_INCREMENT,
        owner_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        state ENUM('open', 'closed') NOT NULL,
        priority INT NOT NULL,
        updated_at DATETIME NOT NULL
      )
    `);
    await connection.execute(
      `INSERT INTO work_items (owner_id, title, state, priority, updated_at)
       VALUES (?, ?, ?, ?, ?), (?, ?, ?, ?, ?), (?, ?, ?, ?, ?)`,
      [7, 'older', 'open', 1, '2026-01-01 00:00:00', 7, 'newer', 'closed', 3, '2026-01-03 00:00:00', 8, 'other owner', 'open', 99, '2026-01-04 00:00:00'],
    );

    const byUpdated = await listWorkItems(connection, { ownerId: 7 });
    assert.deepEqual(byUpdated.map((row) => row.title), ['newer', 'older']);

    const byPriority = await listWorkItems(connection, { ownerId: 7, state: 'open', sort: 'priority', limit: 1 });
    assert.deepEqual(byPriority.map((row) => row.title), ['older']);

    const safeFallback = await listWorkItems(connection, { ownerId: 7, sort: 'priority DESC; DROP TABLE work_items' });
    assert.equal(safeFallback.length, 2);
  } catch (error) {
    if (error && ['ECONNREFUSED', 'ENOTFOUND', 'ER_ACCESS_DENIED_ERROR', 'ER_BAD_DB_ERROR'].includes(error.code)) {
      t.skip(`MySQL fixture unavailable (${error.code})`);
      return;
    }
    throw error;
  } finally {
    await connection.end();
  }
});
