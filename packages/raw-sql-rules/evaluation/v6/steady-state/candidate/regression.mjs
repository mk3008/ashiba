import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

const candidateDirectory = path.dirname(fileURLToPath(import.meta.url));
const fixtureDirectory = path.resolve(candidateDirectory, '../../../../evaluation/v5/bootstrap/fixture');
const applicationSql = await fs.readFile(path.join(candidateDirectory, 'list-work-items.sql'), 'utf8');
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

const ownerId = 2147480002;
const rowsToSeed = [
  {
    ownerId,
    title: 'minimum priority candidate',
    state: 'open',
    priority: 3,
    amount: '10.00',
    updatedAt: '2026-08-31 09:00:00',
  },
  {
    ownerId,
    title: 'high priority candidate',
    state: 'closed',
    priority: 8,
    amount: '20.50',
    updatedAt: '2026-08-31 10:00:00',
  },
  {
    ownerId: ownerId + 1,
    title: 'different owner candidate',
    state: 'open',
    priority: 99,
    amount: '99.99',
    updatedAt: '2026-08-31 11:00:00',
  },
];

try {
  // This setup statement is test control; the schema itself comes from canonical DDL.
  await connection.query('DROP TABLE IF EXISTS work_items');
  await connection.query(schemaSql);
  await connection.beginTransaction();

  for (const item of rowsToSeed) {
    const [insertResult] = await connection.execute(seedSql, item);
    assert.equal(insertResult.affectedRows, 1);
  }

  const [allOwnerRows] = await connection.execute(applicationSql, {
    ownerId,
    minPriority: null,
  });
  assert.equal(allOwnerRows.length, 2);
  assert.deepEqual(allOwnerRows.map((row) => row.title), [
    'high priority candidate',
    'minimum priority candidate',
  ]);
  assert.deepEqual(allOwnerRows.map((row) => row.priority), [8, 3]);
  assert.ok(allOwnerRows.every((row) => typeof row.id === 'number'));
  assert.ok(allOwnerRows.every((row) => row.updated_at instanceof Date));
  assert.equal(allOwnerRows[0].amount, '20.50');

  const [filteredRows] = await connection.execute(applicationSql, {
    ownerId,
    minPriority: 8,
  });
  assert.equal(filteredRows.length, 1);
  assert.equal(filteredRows[0].title, 'high priority candidate');
  assert.equal(filteredRows[0].priority, 8);

  const [otherOwnerRows] = await connection.execute(applicationSql, {
    ownerId: ownerId + 1,
    minPriority: 8,
  });
  assert.equal(otherOwnerRows.length, 1);
  assert.equal(otherOwnerRows[0].title, 'different owner candidate');

  console.log('PASS: native mysql2 listing returned both owner rows and runtime types');
  console.log('PASS: optional minimum-priority filter and owner boundary behaved correctly');
  await connection.rollback();
} finally {
  await connection.end();
}
