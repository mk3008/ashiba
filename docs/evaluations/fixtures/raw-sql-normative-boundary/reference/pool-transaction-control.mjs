import { createHash, randomUUID } from 'node:crypto';
import pg from 'pg';
import { compilePostgresQuery } from '../../../../../packages/driver-adapter-pg/dist/index.js';

const connectionString = process.env.ASHIBA_EVALUATION_DATABASE_URL;
if (!connectionString) throw new Error('ASHIBA_EVALUATION_DATABASE_URL is required');
const canonicalSql = 'select label from ablation_rows where id = :id::integer';
const sourceHash = `sha256:${createHash('sha256').update(canonicalSql).digest('hex')}`;
const query = {
  sql: canonicalSql,
  queryModel: { analysis: { sourceHash }, bindings: { postgres: {
    sourceHash,
    sql: 'select label from ablation_rows where id = $1::integer',
    orderedNames: ['id'],
  } } },
};
const lowerNamed = (sql, params) => ({ sql: sql.replace(':id', '$1'), values: [params.id] });
const r1 = compilePostgresQuery(query, { id: 2 });
const r2 = lowerNamed(canonicalSql, { id: 2 });
if (r1.sql !== r2.sql || JSON.stringify(r1.values) !== JSON.stringify(r2.values)) throw new Error('R1/R2 transaction query mismatch');

const schema = `raw_sql_tx_${randomUUID().replaceAll('-', '')}`;
const pool = new pg.Pool({ connectionString, max: 2 });
let transactionClient;
let outsideClient;
try {
  await pool.query(`create schema ${schema}`);
  transactionClient = await pool.connect();
  outsideClient = await pool.connect();
  await transactionClient.query(`set search_path to ${schema}`);
  await outsideClient.query(`set search_path to ${schema}`);
  await transactionClient.query('create table ablation_rows (id integer primary key, label text not null)');
  await transactionClient.query("insert into ablation_rows values (1, 'committed')");
  await transactionClient.query('begin');
  await transactionClient.query("insert into ablation_rows values (2, 'uncommitted')");
  const insideR1 = await transactionClient.query(r1.sql, r1.values);
  const insideR2 = await transactionClient.query(r2.sql, r2.values);
  const outside = await outsideClient.query(r1.sql, r1.values);
  if (insideR1.rows[0]?.label !== 'uncommitted' || insideR2.rows[0]?.label !== 'uncommitted' || outside.rows.length !== 0) {
    throw new Error('explicit-client transaction visibility mismatch');
  }
  await transactionClient.query('commit');
  const afterCommit = await outsideClient.query(r1.sql, r1.values);
  if (afterCommit.rows[0]?.label !== 'uncommitted') throw new Error('commit visibility mismatch');
  console.log(JSON.stringify({
    r1: { sql: r1.sql, values: r1.values },
    r2,
    poolTransaction: { insideR1: 'uncommitted', insideR2: 'uncommitted', outsideBeforeCommitRows: 0, outsideAfterCommit: 'uncommitted' },
  }));
} finally {
  if (transactionClient) { await transactionClient.query('rollback').catch(() => {}); transactionClient.release(); }
  if (outsideClient) outsideClient.release();
  await pool.query(`drop schema if exists ${schema} cascade`).catch(() => {});
  await pool.end();
}
