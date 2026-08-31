import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

const candidateDirectory = path.dirname(fileURLToPath(import.meta.url));
const fixtureDirectory = path.resolve(candidateDirectory, '..', '..', '..', 'bootstrap', 'fixture');
const applicationSql = await fs.readFile(path.join(candidateDirectory, 'list-work-items.sql'), 'utf8');
const seedSql = await fs.readFile(path.join(candidateDirectory, 'seed-work-items.sql'), 'utf8');
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
  // This setup statement is test control; the schema itself comes from canonical DDL.
  await connection.query('DROP TABLE IF EXISTS work_items');
  await connection.query(schemaSql);
  await connection.beginTransaction();
  await connection.execute(seedSql, {
    ownerId,
    lowTitle: 'below threshold',
    openState: 'open',
    lowPriority: 3,
    lowAmount: '3.00',
    lowUpdatedAt: '2026-08-30 10:00:00',
    highTitle: 'meets threshold',
    highPriority: 8,
    highAmount: '8.00',
    highUpdatedAt: '2026-08-30 09:00:00',
  });

  const [filteredRows] = await connection.execute(applicationSql, {
    ownerId,
    state: 'open',
    minimumPriority: 8,
  });
  assert.equal(filteredRows.length, 1);
  assert.equal(filteredRows[0].title, 'meets threshold');
  assert.equal(filteredRows[0].priority, 8);
  assert.ok(filteredRows[0].updated_at instanceof Date);

  const [unfilteredRows] = await connection.execute(applicationSql, {
    ownerId,
    state: 'open',
    minimumPriority: null,
  });
  assert.equal(unfilteredRows.length, 2);
  assert.equal(unfilteredRows[0].title, 'below threshold');
  assert.equal(unfilteredRows[1].title, 'meets threshold');

  console.log('PASS: native mysql2 execution verified minimumPriority filtering and NULL compatibility');
  await connection.rollback();
} finally {
  await connection.end();
}
