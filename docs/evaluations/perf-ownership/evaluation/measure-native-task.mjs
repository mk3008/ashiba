import { performance } from 'node:perf_hooks';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import pg from 'pg';

const output = process.argv[2];
if (!output) throw new Error('usage: node measure-native-task.mjs <output.json>');
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const values = [42, 100];
const sql = `select id, customer_id, status, created_at
from perf_tickets
where customer_id = $1
order by id
limit $2`;

try {
  await pool.query(sql, values);
  const durationsMs = [];
  for (let index = 0; index < 10; index += 1) {
    const started = performance.now();
    const result = await pool.query(sql, values);
    durationsMs.push(performance.now() - started);
    if (result.rowCount !== 100) throw new Error(`expected 100 rows, received ${result.rowCount}`);
  }
  const plan = await pool.query(`explain (analyze, buffers, format json) ${sql}`, values);
  const sorted = [...durationsMs].sort((left, right) => left - right);
  const result = {
    queryId: 'perf-tickets-by-customer',
    sql,
    values,
    dataset: { table: 'perf_tickets', rows: 100000, matchingRows: 100 },
    repetitions: durationsMs.length,
    durationsMs,
    medianDurationMs: sorted[Math.floor(sorted.length / 2)],
    explainAnalyze: plan.rows[0]?.['QUERY PLAN'] ?? null,
    measuredAt: new Date().toISOString(),
    runner: 'native-pg',
  };
  writeFileSync(resolve(output), `${JSON.stringify(result, null, 2)}\n`, 'utf8');
} finally {
  await pool.end();
}
