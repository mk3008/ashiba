import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from './runtime.mjs';
const require = createRequire(new URL('../../../../../packages/driver-adapter-pg/package.json', import.meta.url));
const pg = require('pg');
const fixture = dirname(dirname(fileURLToPath(import.meta.url)));
const databaseUrl = process.env.ASHIBA_VERSIONED_ARTIFACT_DATABASE_URL ?? 'postgresql://runtime_runner:runtime_runner_password@127.0.0.1:55435/runtime_boundary';
const client = new pg.Client({ connectionString: databaseUrl });
const checks = [];
const check = async (name, fn) => { try { await fn(); checks.push({ name, ok: true }); } catch (error) { checks.push({ name, ok: false, error: String(error.message ?? error) }); } };
try {
  await client.connect();
  await client.query('create schema if not exists versioned_artifact_operations_eval');
  await client.query('set search_path to versioned_artifact_operations_eval');
  await client.query('drop table if exists orders');
  await client.query('create table orders (id integer primary key, account_id integer not null, status text not null, created_at timestamptz not null)');
  await client.query("insert into orders values (1, 7, 'open', '2026-01-01'), (2, 7, 'closed', '2026-01-02'), (3, 8, 'open', '2026-01-03')");
  await check('present optional filter', async () => { const p = compile('search', { status: 'open' }); const r = await client.query(p.sql, [7, 'open', 5]); if (r.rows.map((row) => row.id).join(',') !== '1') throw new Error('unexpected rows'); });
  await check('omitted optional filter and deterministic G1 values', async () => { const p = compile('search', { status: null }); const r = await client.query(p.sql, [7, 5]); if (r.rows.map((row) => row.id).join(',') !== '2,1' || p.names.join(',') !== 'accountId,limit') throw new Error('unexpected omission behavior'); });
} finally { await client.end().catch(() => {}); }
const output = { databaseUrl: databaseUrl.replace(/:[^:@/]+@/, ':***@'), checks, ok: checks.every((entry) => entry.ok) };
mkdirSync(join(fixture, 'results'), { recursive: true });
writeFileSync(join(fixture, 'results/postgres-live.json'), `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
process.exitCode = output.ok ? 0 : 1;
