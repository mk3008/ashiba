import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from './runtime.mjs';
const require = createRequire(new URL('../../../../../../packages/driver-adapter-pg/package.json', import.meta.url));
const pg = require('pg');
const fixture = dirname(dirname(fileURLToPath(import.meta.url)));
const url = process.env.ASHIBA_VERSIONED_ARTIFACT_DATABASE_URL ?? 'postgresql://runtime_runner:runtime_runner_password@127.0.0.1:55435/runtime_boundary';
const client = new pg.Client({ connectionString: url }); const checks = [];
const check = async (name, run) => { try { await run(); checks.push({ name, ok: true }); } catch (error) { checks.push({ name, ok: false, error: String(error.message ?? error) }); } };
try {
  await client.connect(); await client.query('create schema if not exists marker_free_g4_eval'); await client.query('set search_path to marker_free_g4_eval');
  await client.query('drop table if exists work_items'); await client.query('create table work_items (id integer primary key, name text not null, priority text not null, state text not null, created_at timestamptz not null)');
  await client.query("insert into work_items values (1, 'alpha', 'normal', 'active', '2026-01-02'), (2, 'bravo', 'urgent', 'active', '2026-01-01'), (3, 'charlie', 'low', 'active', '2026-01-03'), (4, 'done', 'urgent', 'done', '2026-01-04')");
  const run = async (sort) => { const prepared = compile(sort); const result = await client.query(prepared.sql, ['done']); return { prepared, ids: result.rows.map((row) => row.id).join(',') }; };
  await check('default stable tie breaker', async () => { if ((await run([])).ids !== '1,2,3') throw new Error('default order'); });
  await check('single name ordering', async () => { if ((await run([{ key: 'name', direction: 'desc' }])).ids !== '3,2,1') throw new Error('name order'); });
  await check('two-key CASE and direction mix', async () => { if ((await run([{ key: 'priority', direction: 'asc' }, { key: 'createdAt', direction: 'desc' }])).ids !== '2,1,3') throw new Error('two key order'); });
  await check('three-key composition', async () => { if ((await run([{ key: 'priority', direction: 'desc' }, { key: 'createdAt', direction: 'asc' }, { key: 'name', direction: 'asc' }])).ids !== '3,1,2') throw new Error('three key order'); });
  await check('deterministic G1 bind lowering', async () => { const p = compile([]); if (p.names.join(',') !== 'doneState' || !p.sql.includes('$1')) throw new Error('G1 mismatch'); });
} finally { await client.end().catch(() => {}); }
const output = { databaseUrl: url.replace(/:[^:@/]+@/, ':***@'), checks, ok: checks.every((item) => item.ok) };
mkdirSync(join(fixture, 'results'), { recursive: true }); writeFileSync(join(fixture, 'results/postgres-live.json'), `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2)); process.exitCode = output.ok ? 0 : 1;
