import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import pg from 'pg';

const fixtureRoot = path.resolve(import.meta.dirname, '..');
const candidateId = process.argv[2];
if (!candidateId) throw new Error('Usage: node evaluator/evaluate.mjs <candidate-id>');
const candidateRoot = path.join(fixtureRoot, 'candidates', candidateId);
const submissionPath = path.join(candidateRoot, 'submission.mjs');
const resultPath = path.join(fixtureRoot, 'evidence', `${candidateId}.json`);
const connectionString = process.env.ASHIBA_EVALUATION_DATABASE_URL ?? 'postgres://postgres:postgres@127.0.0.1:5432/postgres';
const schema = `raw_sql_audit_${randomUUID().replaceAll('-', '')}`;
const checks = [];
const check = async (id, fn) => {
  try { await fn(); checks.push({ id, status: 'pass' }); }
  catch (error) { checks.push({ id, status: 'fail', detail: error instanceof Error ? error.message : String(error) }); }
};
const expectIds = (rows, expected) => {
  const actual = rows.map((row) => Number(row.id)).sort((a, b) => a - b);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`expected ids ${expected}, got ${actual}`);
};
const sqlAssets = (value) => typeof value === 'string'
  ? [value]
  : value && typeof value === 'object'
    ? Object.values(value).flatMap(sqlAssets)
    : [];

const source = await readFile(submissionPath, 'utf8');
// This intentionally targets SQL passed directly to the driver, not a mechanical
// named-parameter lowerer that may concatenate output while scanning a canonical asset.
const unsafeConstruction = /client\.query\(\s*`[^`]*\$\{[\s\S]*?\}|client\.query\([^\n;]*\+\s*input/.test(source);
await check('source/no-obvious-runtime-sql-construction', () => {
  if (unsafeConstruction) throw new Error('source contains interpolation or concatenation in a SQL/query expression');
});

const { Client } = pg;
const client = new Client({ connectionString });
await client.connect();
try {
  await client.query(`create schema ${schema}`);
  await client.query(`set search_path to ${schema}`);
  await client.query(`create table items (id integer primary key, title text not null, status text not null, priority integer not null, owner text, note text)`);
  await client.query(`insert into items (id, title, status, priority, owner, note) values
    (1, 'Alpha', 'open', 2, 'ana', 'x'),
    (2, 'Bravo', 'open', 1, 'ben', 'ordinary'),
    (3, 'Cedar', 'closed', 3, 'ana', 'special'),
    (4, 'Delta', 'open', 2, null, 'needle')`);
  const submission = await import(`${pathToFileURL(submissionPath).href}?nonce=${Date.now()}`);
  const queries = submission.queries;
  await check('shape/queries', () => {
    for (const name of ['search', 'list', 'openItems', 'ownedItems', 'bindingEdgeCases']) {
      if (!queries?.[name] || typeof queries[name].execute !== 'function') throw new Error(`missing queries.${name}`);
      const assets = sqlAssets(queries[name].sql);
      if (assets.length === 0 || assets.some((asset) => typeof asset !== 'string')) throw new Error(`${name} does not expose canonical SQL`);
      if (['search', 'ownedItems', 'bindingEdgeCases'].includes(name) && !assets.some((asset) => asset.includes(':'))) throw new Error(`${name} does not expose named canonical SQL`);
    }
  });
  await check('w1/all-null', async () => expectIds(await queries.search.execute(client, { status: null, owner: null, needle: null }), [1, 2, 3, 4]));
  await check('w1/status-owner-needle', async () => expectIds(await queries.search.execute(client, { status: 'open', owner: 'ana', needle: 'alp' }), [1]));
  await check('w1/hostile-value', async () => expectIds(await queries.search.execute(client, { status: null, owner: null, needle: "' OR 1=1 --" }), []));
  await check('w2/reviewed-sort', async () => {
    const rows = await queries.list.execute(client, { sort: 'priority', direction: 'asc' });
    const ids = rows.map((row) => Number(row.id));
    if (JSON.stringify(ids) !== JSON.stringify([2, 1, 4, 3])) throw new Error(`unexpected priority ordering ${ids}`);
  });
  await check('w2/hostile-sort-rejected-before-execution', async () => {
    let calls = 0;
    const spy = { query: async (...args) => { calls += 1; return client.query(...args); } };
    let rejected = false;
    try { await queries.list.execute(spy, { sort: 'title; drop table items; --', direction: 'asc' }); } catch { rejected = true; }
    if (!rejected || calls !== 0) throw new Error('hostile sort was not rejected before database execution');
  });
  await check('w3/local-purposeful-queries', async () => {
    expectIds(await queries.openItems.execute(client, {}), [1, 2, 4]);
    expectIds(await queries.ownedItems.execute(client, { owner: 'ana' }), [1, 3]);
    if (queries.openItems.sql === queries.ownedItems.sql) throw new Error('distinct query purposes share one canonical SQL asset');
  });
  await check('w4/lexically-correct-named-lowering', async () => {
    const rows = await queries.bindingEdgeCases.execute(client, { note: 'x', status: 'open' });
    const canonical = queries.bindingEdgeCases.sql;
    const pseudoParameterInComment = /--[^\n]*:not_a_parameter|\/\*[\s\S]*?:not_a_parameter[\s\S]*?\*\//.test(canonical);
    if (rows.length !== 1 || rows[0].note !== 'x' || rows[0].status !== 'open' || !canonical.includes(':not_a_parameter') || !pseudoParameterInComment) throw new Error('binding edge-case result mismatch');
  });
} finally {
  await client.query('reset search_path').catch(() => {});
  await client.query(`drop schema if exists ${schema} cascade`).catch(() => {});
  await client.end();
}
const result = { candidateId, schema, connection: 'runner-owned PostgreSQL nonce schema', checks, pass: checks.every((item) => item.status === 'pass') };
await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result));
