import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFixture, databaseState, dropFixture, quoteSchema, withClient } from '../../fixture.mjs';
import { ARM, errorValue, importCandidate, json, sha, staticIsolationCheck, walk, writeJson } from '../common.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const MUTATIONS = Object.freeze(['column-rename', 'nullability-tighten', 'integer-to-bigint']);

function parseArgs(argv) {
  const value = (name) => { const index = argv.indexOf(name); return index < 0 ? undefined : argv[index + 1]; };
  return { arm: value('--arm'), candidate: value('--candidate'), sourceRoot: value('--source-root'), output: value('--output'), databaseUrl: value('--database-url') ?? process.env.DATABASE_URL, typecheck: value('--typecheck-command'), treatment: value('--treatment-command'), test: value('--test-command') };
}

function command(command, cwd) {
  if (!command) return Promise.resolve({ status: 'not-run' });
  return new Promise((resolveCommand) => {
    const started = Date.now();
    const child = spawn(command, { cwd, shell: true, windowsHide: true, env: Object.fromEntries(Object.entries(process.env).filter(([key]) => key !== 'DATABASE_URL')) });
    let stdout = ''; let stderr = '';
    child.stdout?.on('data', (chunk) => { stdout += String(chunk); });
    child.stderr?.on('data', (chunk) => { stderr += String(chunk); });
    child.once('error', (error) => resolveCommand({ status: 'fail', error: errorValue(error), durationMs: Date.now() - started, stdout, stderr }));
    child.once('exit', (code, signal) => resolveCommand({ status: code === 0 ? 'pass' : 'fail', exitCode: code, signal, durationMs: Date.now() - started, stdout, stderr }));
  });
}

async function alter(databaseUrl, schema, mutation) {
  const s = quoteSchema(schema);
  return withClient(databaseUrl, async (client) => {
    if (mutation === 'column-rename') await client.query(`ALTER TABLE ${s}.tickets RENAME COLUMN title TO subject`);
    if (mutation === 'nullability-tighten') {
      await client.query(`UPDATE ${s}.tickets SET assignee = 'runner-compatible' WHERE assignee IS NULL`);
      await client.query(`ALTER TABLE ${s}.tickets ALTER COLUMN assignee SET NOT NULL`);
    }
    if (mutation === 'integer-to-bigint') await client.query(`ALTER TABLE ${s}.tickets ALTER COLUMN priority TYPE bigint`);
  });
}

function event(stage, result, detail) { return { stage, status: result, detail }; }

async function runCandidateExecution(candidate, fixture) {
  const module = await importCandidate(candidate);
  if (typeof module.createApplication !== 'function') throw new Error('candidate must export createApplication(runtime)');
  const app = await module.createApplication({ connectionString: fixture.candidateDatabaseUrl, schema: fixture.schema });
  if (!app || typeof app.get !== 'function' || typeof app.list !== 'function' || typeof app.close !== 'function') throw new Error('candidate G1 API is incomplete');
  try {
    await app.get({ id: '101' });
    await app.list({ sort: 'id', direction: 'asc', offset: 0, limit: 10 });
  } finally { await app.close().catch(() => undefined); }
}

async function oneMutation({ mutation, candidate, sourceRoot, databaseUrl, commands, baselineHash }) {
  const item = { mutation, observations: [], startedAt: new Date().toISOString() };
  const before = await walk(sourceRoot);
  item.sourceHashBefore = sha(json(before));
  if (item.sourceHashBefore !== baselineHash) {
    item.protocolFailure = 'source hash differs before mutation';
    item.firstDetectionStage = 'not-detected-in-measured-stages';
    return item;
  }
  let fixture;
  try {
    fixture = await createFixture(databaseUrl);
    item.schema = fixture.schema;
    const baseline = await runCandidateExecution(candidate, fixture).then(() => 'pass', (error) => ({ error: errorValue(error) }));
    item.observations.push(event('baseline-application-execution', baseline === 'pass' ? 'pass' : 'fail', baseline));
    if (baseline !== 'pass') { item.protocolFailure = 'baseline candidate execution failed'; return item; }
    await alter(databaseUrl, fixture.schema, mutation);
    for (const [stage, text] of [['typecheck', commands.typecheck], ['treatment-command', commands.treatment], ['candidate-test', commands.test]]) {
      const result = await command(text, sourceRoot);
      item.observations.push(event(stage, result.status, result));
      if (result.status === 'fail') { item.firstDetectionStage = stage; return item; }
    }
    try {
      await runCandidateExecution(candidate, fixture);
      item.observations.push(event('application-execution', 'pass', 'get and list resolved after database-only mutation'));
      item.firstDetectionStage = 'not-detected-in-measured-stages';
    } catch (error) {
      item.observations.push(event('application-execution', 'fail', errorValue(error)));
      item.firstDetectionStage = 'application-execution';
    }
  } catch (error) {
    item.observations.push(event('runner-oracle', 'fail', errorValue(error)));
    item.firstDetectionStage = 'runner-oracle';
  } finally {
    if (fixture) {
      try { item.finalDatabaseState = await databaseState(databaseUrl, fixture.schema); } catch (error) { item.finalDatabaseState = { status: 'unavailable', error: errorValue(error) }; }
      item.cleanup = await dropFixture(fixture);
    } else item.cleanup = { status: 'not-run' };
  }
  const after = await walk(sourceRoot);
  item.sourceHashAfter = sha(json(after));
  item.sourceUnchanged = item.sourceHashBefore === item.sourceHashAfter;
  if (!item.sourceUnchanged) item.protocolFailure = 'candidate source changed during SD runner';
  item.finishedAt = new Date().toISOString();
  return item;
}

export async function runSchemaDrift(input) {
  const { arm, candidate, sourceRoot, output, databaseUrl, typecheck, treatment, test } = input;
  if (!ARM.has(arm)) throw new Error('--arm must be A, P, S, D, K, or G');
  if (!candidate || !sourceRoot || !output || !databaseUrl) throw new Error('--candidate, --source-root, --output, and DATABASE_URL are required');
  const root = resolve(sourceRoot);
  const manifest = await walk(root);
  const record = { harness: 'sd-schema-drift-v1', protocol: 'secondary-controls-v1', control: 'SD', arm, candidatePath: resolve(candidate), sourceRoot: root, candidateSourceManifest: manifest, baselineSourceHash: sha(json(manifest)), staticInspection: await staticIsolationCheck(root), commands: { typecheck, treatment, test }, mutations: [], startedAt: new Date().toISOString() };
  if (!record.staticInspection.pass) record.protocolFailure = 'static isolation failed';
  else for (const mutation of MUTATIONS) record.mutations.push(await oneMutation({ mutation, candidate, sourceRoot: root, databaseUrl, commands: { typecheck, treatment, test }, baselineHash: record.baselineSourceHash }));
  record.status = !record.protocolFailure && record.mutations.length === MUTATIONS.length && record.mutations.every((item) => item.cleanup?.status === 'pass' && !item.protocolFailure) ? 'P' : 'F';
  record.finishedAt = new Date().toISOString();
  await writeJson(output, record);
  return record;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const record = await runSchemaDrift(parseArgs(process.argv.slice(2)));
  console.log(json({ status: record.status, mutations: record.mutations.map((item) => ({ mutation: item.mutation, firstDetectionStage: item.firstDetectionStage })) }));
  if (record.status !== 'P') process.exitCode = 1;
}
