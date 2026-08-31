import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { listWorkItems } from './list-work-items.mjs';

const candidateDirectory = path.dirname(fileURLToPath(import.meta.url));
const fixtureDirectory = path.resolve(candidateDirectory, '..', '..', '..', 'v5', 'bootstrap', 'fixture');
const seedSql = await fs.readFile(path.join(candidateDirectory, 'seed-work-item.sql'), 'utf8');
const schemaSql = await fs.readFile(path.join(fixtureDirectory, 'schema.sql'), 'utf8');

const connection = await mysql.createConnection({
  host: '127.0.0.1',
  port: 33306,
  user: 'raw_sql_rules',
  password: 'raw_sql_rules',
  database: 'raw_sql_rules',
  namedPlaceholders: true,
});

const ownerId = 2147480000 - (process.pid % 1000);
try {
  // Test control only; the canonical DDL remains the source of the schema.
  await connection.query('DROP TABLE IF EXISTS work_items');
  await connection.query(schemaSql);
  await connection.beginTransaction();
  await connection.execute(seedSql, {
    ownerId,
    title: 'bootstrap regression item',
    state: 'open',
    priority: 7,
    amount: '12.50',
    updatedAt: '2026-08-30 12:34:56',
  });

  const rows = await listWorkItems(connection, { ownerId, state: null });
  assert.equal(rows.length, 1);
  const [row] = rows;
  assert.equal(row.owner_id, ownerId);
  assert.equal(row.title, 'bootstrap regression item');
  assert.equal(row.state, 'open');
  assert.equal(row.priority, 7);
  assert.equal(row.amount, '12.50');
  assert.ok(row.updated_at instanceof Date);
  assert.equal(typeof row.id, 'number');
  console.log('PASS: native mysql2 execution returned expected values and runtime types');
  await connection.rollback();
} finally {
  await connection.end();
}
