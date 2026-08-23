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
if (!candidate) throw new Error('usage: node runner/brownfield-live-oracle.mjs <candidate>');
const artifact = JSON.parse(readFileSync(path.join(fixtureRoot, 'candidates', candidate, 'brownfield-artifact.json'), 'utf8'));
const ids = ['m1-parameter-order', 'm2-add-optional', 'm3-format-comment', 'm4-sort-case', 'm5-cte-join'];
const checks = [];
const check = async (name, run) => { try { await run(); checks.push({ name, ok: true }); } catch (error) { checks.push({ name, ok: false, error: error instanceof Error ? error.message : String(error) }); } };
await check('small verifier accepts Brownfield artifact', () => { const errors = verifyArtifact(artifact, ids); if (errors.length) throw new Error(errors.join('; ')); });
const client = new pg.Client({ connectionString: databaseUrl });
try {
  await client.connect();
  await client.query('set search_path to ai_artifact_generation_eval');
  const base = { limit: 20, offset: 0, assignee_supplied: false, customer_id_supplied: false, priority_supplied: false };
  const execute = async (id, params, sort = []) => { const value = prepare(artifact.artifacts[id], params, sort); return { value, result: await client.query(value.sql, value.values) }; };
  await check('M1 parameter reorder regenerates ordered values', async () => { const { value, result } = await execute('m1-parameter-order', { ...base, excluded_name: 'never' }); if (value.orderedNames.join(',') !== 'excluded_name,limit,offset' || result.rows.length !== 3) throw new Error('M1 regeneration mismatch'); });
  await check('M2 added optional filter regenerates range', async () => { const { result } = await execute('m2-add-optional', { ...base, name_supplied: true, name_is_null: false, name: 'alpha' }); if (result.rows.map((row) => row.id).join(',') !== '1') throw new Error('M2 optional mismatch'); });
  await check('M3 formatting drift preserves behavior', async () => { const { result } = await execute('m3-format-comment', base); if (result.rows.length !== 3) throw new Error('M3 result mismatch'); });
  await check('M4 changed CASE ordering is live', async () => { const { result } = await execute('m4-sort-case', base, [{ key: 'priority', direction: 'asc' }]); if (result.rows.map((row) => row.id).join(',') !== '3,2,1') throw new Error('M4 CASE ordering mismatch'); });
  await check('M5 CTE/JOIN change preserves optional and sort', async () => { const { result } = await execute('m5-cte-join', { ...base, customer_id_supplied: true, customer_id_is_null: false, customer_id: 1 }, [{ key: 'priority', direction: 'asc' }]); if (result.rows.map((row) => row.id).join(',') !== '1,2') throw new Error('M5 result mismatch'); });
} finally { await client.end().catch(() => {}); }
const output = { candidate, checks, ok: checks.every((entry) => entry.ok) };
const outputDir = path.join(fixtureRoot, 'brownfield-live-results');
mkdirSync(outputDir, { recursive: true });
writeFileSync(path.join(outputDir, `${candidate}.json`), `${JSON.stringify(output, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
process.exitCode = output.ok ? 0 : 1;
