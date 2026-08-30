import { mkdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { createFixture, databaseState, dropFixture, quoteSchema, withClient } from '../../fixture.mjs';
import { ARM, errorValue, importCandidate, json, sha, staticIsolationCheck, walk, writeJson } from '../common.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REQUESTS = Object.freeze([
  { id: 'status-count', input: { dimensions: ['status'], metric: 'count', includeTagJoin: false } },
  { id: 'status-assignee-priority', input: { dimensions: ['status', 'assignee'], metric: 'priorityTotal', includeTagJoin: false, statuses: ['open', 'pending'] } },
  { id: 'hostile-tag', input: { dimensions: ['tag', 'status'], metric: 'count', includeTagJoin: true, requestedTag: "vip'; DROP TABLE tickets; --" } },
]);

function args(argv) {
  const value = (name) => { const index = argv.indexOf(name); return index < 0 ? undefined : argv[index + 1]; };
  return { arm: value('--arm'), replicate: Number(value('--replicate')), candidate: value('--candidate'), sourceRoot: value('--source-root'), output: value('--output'), databaseUrl: value('--database-url') ?? process.env.DATABASE_URL };
}

function normal(value) {
  return JSON.parse(JSON.stringify(value, (_, item) => typeof item === 'bigint' ? Number(item) : item));
}

function check(record, id, condition, detail) {
  record.checks.push({ id, status: condition ? 'pass' : 'fail', detail });
}

function validation(error) { return error?.code === 'VALIDATION'; }

async function prepareReportData(databaseUrl, schema, role) {
  const s = quoteSchema(schema);
  await withClient(databaseUrl, async (client) => {
    await client.query(`CREATE TABLE ${s}.ticket_tags (ticket_id bigint NOT NULL REFERENCES ${s}.tickets(id), tag text NOT NULL, PRIMARY KEY (ticket_id, tag))`);
    await client.query(`INSERT INTO ${s}.ticket_tags (ticket_id, tag) VALUES (101, 'vip'), (101, 'support'), (102, 'vip'), (103, 'standard')`);
    await client.query(`GRANT SELECT ON ${s}.ticket_tags TO "${role}"`);
  });
}

async function expected(databaseUrl, schema, input) {
  const dimensions = input.dimensions;
  const fields = { status: 't.status::text', assignee: 't.assignee', tag: 'tt.tag' };
  const metric = input.metric === 'count' ? 'COUNT(*)::int' : 'COALESCE(SUM(t.priority), 0)::int';
  const joins = input.includeTagJoin ? ` JOIN ${quoteSchema(schema)}.ticket_tags tt ON tt.ticket_id = t.id` : '';
  const select = dimensions.map((name) => `${fields[name]} AS "${name}"`).join(', ');
  const filters = [];
  const params = [];
  if (input.statuses?.length) { params.push(input.statuses); filters.push(`t.status::text = ANY($${params.length}::text[])`); }
  if (input.requestedTag !== undefined) { params.push(input.requestedTag); filters.push(`tt.tag = $${params.length}`); }
  const group = dimensions.map((name) => fields[name]).join(', ');
  const order = dimensions.map((name) => `${fields[name]} ASC NULLS LAST`).join(', ');
  const sql = `SELECT ${select}, ${metric} AS "metric" FROM ${quoteSchema(schema)}.tickets t${joins}${filters.length ? ` WHERE ${filters.join(' AND ')}` : ''} GROUP BY ${group} ORDER BY ${order}`;
  return withClient(databaseUrl, async (client) => normal((await client.query(sql, params)).rows));
}

function validRows(value) { return Array.isArray(value) && value.every((row) => row && typeof row === 'object' && !Array.isArray(row)); }

async function evaluateRequest(record, app, databaseUrl, schema, item) {
  const expectedRows = await expected(databaseUrl, schema, item.input);
  try {
    const result = await app.runReport(item.input);
    const rowsOk = validRows(result?.rows) && JSON.stringify(normal(result.rows)) === JSON.stringify(expectedRows);
    const sqlOk = typeof result?.sourceSql === 'string' && result.sourceSql.trim().length > 0 && typeof result?.executedSql === 'string' && result.executedSql.trim().length > 0 && !/\bpublic\b/i.test(`${result.sourceSql}\n${result.executedSql}`);
    const paramsOk = Array.isArray(result?.params) && !(`${result.sourceSql}\n${result.executedSql}`).includes("vip'; DROP TABLE tickets; --");
    record.requests.push({ id: item.id, input: item.input, expectedRows, result: normal(result), status: rowsOk && sqlOk && paramsOk ? 'pass' : 'fail' });
    check(record, `${item.id}-rows`, rowsOk, 'runner-owned expected grouped rows');
    check(record, `${item.id}-sql`, sqlOk, 'candidate reports non-public source and executed SQL');
    check(record, `${item.id}-hostile-isolation`, paramsOk, 'hostile tag is not embedded in SQL syntax');
  } catch (error) {
    record.requests.push({ id: item.id, input: item.input, status: 'fail', error: errorValue(error) });
    check(record, `${item.id}-execution`, false, errorValue(error).message);
  }
}

async function closeApp(record, app) {
  try {
    await app.close();
    await app.close();
    check(record, 'close-idempotent', true, 'close resolved twice');
  } catch (error) { check(record, 'close-idempotent', false, errorValue(error).message); }
}

export async function runX1(input) {
  const { arm, replicate, candidate, sourceRoot, output, databaseUrl } = input;
  if (!ARM.has(arm)) throw new Error('--arm must be A, P, S, D, K, or G');
  if (!Number.isInteger(replicate) || replicate < 1) throw new Error('--replicate must be positive');
  if (!candidate || !sourceRoot || !output) throw new Error('--candidate, --source-root, and --output are required');
  const record = { harness: 'x1-open-composition-v1', protocol: 'secondary-controls-v1', control: 'X1', arm, replicate, candidatePath: resolve(candidate), sourceRoot: resolve(sourceRoot), checks: [], requests: [], startedAt: new Date().toISOString() };
  const before = await walk(record.sourceRoot);
  record.candidateSourceManifestBefore = before;
  record.staticInspection = await staticIsolationCheck(record.sourceRoot);
  let fixture;
  let app;
  try {
    if (!databaseUrl) throw new Error('DATABASE_URL is required');
    check(record, 'static-isolation', record.staticInspection.pass, record.staticInspection.findings);
    if (!record.staticInspection.pass) throw new Error('static isolation failed');
    fixture = await createFixture(databaseUrl);
    record.schema = fixture.schema;
    await prepareReportData(databaseUrl, fixture.schema, fixture.role);
    const candidateModule = await importCandidate(candidate);
    if (typeof candidateModule.createReportApplication !== 'function') throw new Error('candidate must export createReportApplication(runtime)');
    app = await candidateModule.createReportApplication({ connectionString: fixture.candidateDatabaseUrl, schema: fixture.schema });
    if (!app || typeof app.runReport !== 'function' || typeof app.close !== 'function') throw new Error('candidate report API is incomplete');
    for (const item of REQUESTS) await evaluateRequest(record, app, databaseUrl, fixture.schema, item);
    for (const item of [
      { id: 'unknown-dimension', input: { dimensions: ['unknown'], metric: 'count', includeTagJoin: false } },
      { id: 'tag-without-join', input: { dimensions: ['tag'], metric: 'count', includeTagJoin: false } },
      { id: 'invalid-status', input: { dimensions: ['status'], metric: 'count', includeTagJoin: false, statuses: ['invalid'] } },
    ]) {
      try { await app.runReport(item.input); check(record, item.id, false, 'candidate accepted invalid report vocabulary'); }
      catch (error) { check(record, item.id, validation(error), errorValue(error)); }
    }
  } catch (error) {
    record.runnerError = errorValue(error);
    check(record, 'runner-execution', false, record.runnerError.message);
  } finally {
    if (app) await closeApp(record, app);
    if (fixture) {
      try { record.finalDatabaseState = await databaseState(databaseUrl, fixture.schema); } catch (error) { record.finalDatabaseState = { status: 'unavailable', error: errorValue(error) }; }
      await writeJson(output.replace(/\.json$/i, '.pre-cleanup.json'), record);
      record.cleanup = await dropFixture(fixture);
    } else record.cleanup = { status: 'not-run' };
  }
  const after = await walk(record.sourceRoot);
  record.candidateSourceManifestAfter = after;
  record.sourceUnchangedDuringRunner = sha(json(before)) === sha(json(after));
  check(record, 'source-unchanged', record.sourceUnchangedDuringRunner, 'runner must not alter candidate source');
  record.status = record.checks.every((item) => item.status === 'pass') && record.cleanup.status === 'pass' ? 'P' : 'F';
  record.finishedAt = new Date().toISOString();
  await writeJson(output, record);
  return record;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const record = await runX1(args(process.argv.slice(2)));
  console.log(json({ status: record.status, output: process.argv[process.argv.indexOf('--output') + 1] ?? null }));
  if (record.status !== 'P') process.exitCode = 1;
}
