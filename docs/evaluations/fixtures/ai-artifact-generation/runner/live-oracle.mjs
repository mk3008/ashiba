import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { verifyArtifact } from '../verifier.mjs';
import { prepare } from '../runtime.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const fixtureRoot = path.join(root, '..');
const candidate = process.argv[2];
const databaseUrl = process.env.ASHIBA_AI_ARTIFACT_DATABASE_URL ?? 'postgresql://runtime_runner:runtime_runner_password@127.0.0.1:55435/runtime_boundary';
if (!candidate) throw new Error('usage: node runner/live-oracle.mjs <candidate>');
const artifact = JSON.parse(readFileSync(path.join(fixtureRoot, 'candidates', candidate, 'artifact.json'), 'utf8'));
const structuralErrors = verifyArtifact(artifact);
const checks = [];
const check = async (name, run) => {
  try { await run(); checks.push({ name, ok: true }); }
  catch (error) { checks.push({ name, ok: false, error: error instanceof Error ? error.message : String(error) }); }
};
await check('small verifier accepts submitted artifact', () => { if (structuralErrors.length) throw new Error(structuralErrors.join('; ')); });

const client = new pg.Client({ connectionString: databaseUrl });
try {
  await client.connect();
  await client.query('create schema if not exists ai_artifact_generation_eval');
  await client.query('set search_path to ai_artifact_generation_eval');
  await client.query('drop table if exists work_items, customers');
  await client.query('create table customers (id bigint primary key, name text not null)');
  await client.query("create table work_items (id bigint primary key, customer_id bigint references customers(id), name text not null, priority text, assignee text, state text not null, created_at timestamptz not null default transaction_timestamp())");
  await client.query("insert into customers (id, name) values (1, 'Acme'), (2, 'Beta')");
  await client.query("insert into work_items (id, customer_id, name, priority, assignee, state, created_at) values (1, 1, 'alpha', 'urgent', 'ana', 'ready', '2026-01-01'), (2, 1, 'bravo', 'normal', null, 'ready', '2026-01-02'), (3, 2, 'charlie', 'low', 'bob', 'ready', '2026-01-03'), (4, null, 'done', 'urgent', null, 'done', '2026-01-04')");
  const execute = (id, params, sort = []) => {
    const prepared = prepare(artifact.artifacts[id], params, sort);
    return client.query(prepared.sql, prepared.values).then((result) => ({ prepared, rows: result.rows }));
  };
  await check('W1 direct native pg named value correctness', async () => {
    const result = await execute('w1-named-lexical', { account_id: 7 });
    if (result.rows[0].account_id !== '7' || result.rows[0].repeated !== '7') throw new Error('repeated named value mismatch');
  });
  const base = { limit: 20, offset: 0 };
  await check('W2 omitted optional filters subtract predicates', async () => {
    const result = await execute('w2-optional-search', { ...base, assignee_supplied: false, customer_id_supplied: false, priority_supplied: false });
    if (result.rows.length !== 3 || result.prepared.sql.includes('assignee_supplied')) throw new Error('omitted branch was not subtracted');
  });
  await check('W2 null optional filter', async () => {
    const result = await execute('w2-optional-search', { ...base, assignee_supplied: true, assignee_is_null: true, customer_id_supplied: false, priority_supplied: false });
    if (result.rows.map((row) => row.id).join(',') !== '2') throw new Error('null state mismatch');
  });
  await check('W2 value optional filter', async () => {
    const result = await execute('w2-optional-search', { ...base, assignee_supplied: true, assignee_is_null: false, assignee: 'ana', customer_id_supplied: false, priority_supplied: false });
    if (result.rows.map((row) => row.id).join(',') !== '1') throw new Error('value state mismatch');
  });
  await check('W2 multi-column CASE sort and stable tie breaker', async () => {
    const result = await execute('w2-optional-search', { ...base, assignee_supplied: false, customer_id_supplied: false, priority_supplied: false }, [{ key: 'priority', direction: 'asc' }, { key: 'name', direction: 'desc' }]);
    if (result.rows.map((row) => row.id).join(',') !== '1,2,3') throw new Error(`CASE sort mismatch: ${result.rows.map((row) => row.id).join(',')}`);
  });
  await check('W3 multi-column direct native pg sort', async () => {
    const result = await execute('w3-sort', base, [{ key: 'created_at', direction: 'desc' }, { key: 'name', direction: 'asc' }]);
    if (result.rows.map((row) => row.id).join(',') !== '3,2,1') throw new Error('multi-column sort mismatch');
  });
  await check('W4 CTE JOIN optional and pagination', async () => {
    const result = await execute('w4-mixed-complex', { ...base, assignee_supplied: false, customer_id_supplied: true, customer_id_is_null: false, customer_id: 1, priority_supplied: false }, [{ key: 'priority', direction: 'asc' }]);
    if (result.rows.map((row) => row.id).join(',') !== '1,2') throw new Error('CTE/JOIN filter mismatch');
  });
  await check('stale source hash rejects before execution', () => {
    const stale = structuredClone(artifact); stale.artifacts['w3-sort'].sourceHash = 'sha256:0000000000000000000000000000000000000000000000000000000000000000';
    if (!verifyArtifact(stale).some((error) => error.includes('stale sourceHash'))) throw new Error('stale artifact accepted');
  });
} finally {
  await client.end().catch(() => {});
}

const output = { candidate, databaseUrl: databaseUrl.replace(/:[^:@/]+@/, ':***@'), checks, ok: checks.every((entry) => entry.ok) };
const outputDir = path.join(fixtureRoot, 'live-oracle-results');
mkdirSync(outputDir, { recursive: true });
writeFileSync(path.join(outputDir, `${candidate}.json`), `${JSON.stringify(output, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
process.exitCode = output.ok ? 0 : 1;
