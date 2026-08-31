import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

const candidateDirectory = path.dirname(fileURLToPath(import.meta.url));
const fixtureDirectory = path.resolve(candidateDirectory, '../../../bootstrap/fixture');
const insertSql = await fs.readFile(path.join(candidateDirectory, 'insert-work-item.sql'), 'utf8');
const listSql = await fs.readFile(path.join(candidateDirectory, 'list-work-items.sql'), 'utf8');
const schemaSql = await fs.readFile(path.join(fixtureDirectory, 'schema.sql'), 'utf8');

const connection = await mysql.createConnection({
  host: '127.0.0.1',
  port: 33306,
  user: 'raw_sql_rules',
  password: 'raw_sql_rules',
  database: 'raw_sql_rules',
  namedPlaceholders: true,
});

const ownerId = 2147480001;
const validItem = {
  ownerId,
  title: 'steady-state insert regression item',
  state: 'closed',
  priority: 9,
  amount: '1234.50',
  updatedAt: '2026-08-31 10:11:12',
};

try {
  // These setup statements are test control; canonical DDL comes from the fixture.
  await connection.query('DROP TABLE IF EXISTS work_items');
  await connection.query(schemaSql);
  await connection.beginTransaction();

  const [insertResult] = await connection.execute(insertSql, validItem);
  assert.equal(insertResult.affectedRows, 1);
  assert.equal(typeof insertResult.insertId, 'number');

  const [rows] = await connection.execute(listSql, { ownerId, state: null });
  assert.equal(rows.length, 1);
  const [row] = rows;
  assert.equal(row.owner_id, ownerId);
  assert.equal(row.title, validItem.title);
  assert.equal(row.state, 'closed');
  assert.equal(row.priority, 9);
  assert.equal(row.amount, '1234.50');
  assert.ok(row.updated_at instanceof Date);
  assert.equal(typeof row.id, 'number');

  // The database ENUM constraint, not application validation, rejects unknown states.
  await assert.rejects(connection.execute(insertSql, {
    ...validItem,
    title: 'invalid state must fail',
    state: 'pending',
  }));

  // The database NOT NULL constraint rejects an absent amount.
  await assert.rejects(connection.execute(insertSql, {
    ...validItem,
    title: 'invalid amount must fail',
    amount: null,
  }));

  console.log('PASS: native mysql2 INSERT/list returned expected values and runtime types');
  console.log('PASS: database rejected invalid ENUM state and NULL amount');
  await connection.rollback();
} finally {
  await connection.end();
}
