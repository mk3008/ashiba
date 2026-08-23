import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { prepare } from '../runtime.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const fixtureRoot = path.join(root, '..');
const artifact = JSON.parse(readFileSync(path.join(fixtureRoot, 'candidates', 'replicate-6', 'artifact.json'), 'utf8'));
const databaseUrl = process.env.ASHIBA_AI_ARTIFACT_DATABASE_URL ?? 'postgresql://runtime_runner:runtime_runner_password@127.0.0.1:55435/runtime_boundary';
const client = new pg.Client({ connectionString: databaseUrl });
const cases = [];
try {
  await client.connect();
  await client.query('set search_path to ai_artifact_generation_eval');
  const base = { limit: 20, offset: 0, assignee_supplied: false, customer_id_supplied: false, priority_supplied: false };
  const wrongSort = structuredClone(artifact);
  wrongSort.artifacts['w2-optional-search'].sort.keys.priority = "case when w.priority = 'low' then 1 when w.priority = 'normal' then 2 else 3 end";
  const wrongSortPrepared = prepare(wrongSort.artifacts['w2-optional-search'], base, [{ key: 'priority', direction: 'asc' }]);
  const wrongSortRows = await client.query(wrongSortPrepared.sql, wrongSortPrepared.values);
  cases.push({ name: 'wrong finite priority expression', liveRejected: wrongSortRows.rows.map((row) => row.id).join(',') !== '1,2,3', actual: wrongSortRows.rows.map((row) => row.id).join(',') });
  const wrongControl = structuredClone(artifact);
  wrongControl.artifacts['w2-optional-search'].optional[0].control = 'customer_id';
  const wrongControlPrepared = prepare(wrongControl.artifacts['w2-optional-search'], { ...base, assignee_supplied: true, assignee_is_null: true });
  const wrongControlRows = await client.query(wrongControlPrepared.sql, wrongControlPrepared.values);
  cases.push({ name: 'wrong optional control meaning', liveRejected: wrongControlRows.rows.map((row) => row.id).join(',') !== '2', actual: wrongControlRows.rows.map((row) => row.id).join(',') });
} finally { await client.end().catch(() => {}); }
const output = { cases, allLiveRejected: cases.every((entry) => entry.liveRejected) };
const outputDir = path.join(fixtureRoot, 'negative-control-results');
mkdirSync(outputDir, { recursive: true });
writeFileSync(path.join(outputDir, 'semantic-live-results.json'), `${JSON.stringify(output, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
process.exitCode = output.allLiveRejected ? 0 : 1;
