import assert from 'node:assert/strict';
import test from 'node:test';

import { createConnection, listWorkItems } from '../list-work-items.js';

test('lists rows through mysql2 when the fixture is enabled', { skip: process.env.RUN_MYSQL_INTEGRATION !== '1' }, async () => {
  const connection = await createConnection();
  try {
    const rows = await listWorkItems(connection, { ownerId: 1, state: 'open', limit: 10 });
    assert.ok(Array.isArray(rows));
  } finally {
    await connection.end();
  }
});
