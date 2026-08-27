// Stage 3 is evaluation-only. It uses a pinned external rawsql-ts installation
// and does not add an Ashiba package dependency or production wrapper.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Pool } from 'pg';
import { compileNamedParameters } from '../../../../packages/named-parameters/dist/compiler.js';
import { bindNamedParameters } from '../../../../packages/named-parameters/dist/index.js';
import { setupTicketQueueDatabase } from '../../../../examples/postgres-ticket-queue-reference/scripts/setup-database.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../..');
const output = path.resolve(here, '..', 'parallelism-results.json');
const databaseUrl = process.env.DATABASE_URL;
const rawsqlRoot = process.env.RAWSQL_TS_EVAL_ROOT;
if (!databaseUrl) throw new Error('DATABASE_URL is required.');
if (!rawsqlRoot) throw new Error('RAWSQL_TS_EVAL_ROOT must identify the pinned external rawsql-ts workspace.');

const testkit = await load('@rawsql-ts/testkit-postgres');
const core = await load('@rawsql-ts/testkit-core');
const rawsqlPackage = JSON.parse(readFileSync(path.join(rawsqlRoot, 'node_modules/@rawsql-ts/testkit-postgres/package.json'), 'utf8'));
const canonicalSql = readFileSync(path.join(root, 'examples/postgres-ticket-queue-reference/src/tickets/get.sql'), 'utf8').replace(/\r\n?/g, '\n');
const compiledCanonical = compileNamedParameters(canonicalSql, { rendering: { style: 'indexed', prefix: '$' } });
const counts = [10, 50, 100, 300];
const requestedConcurrency = [1, 2, 4, 8];
const connectionModels = ['acquiredPerCase', 'sharedPool', 'sharedSingleClient'];
const samples = 3;
const poolMax = 8;

const pool = new Pool({ connectionString: databaseUrl, max: poolMax });
try {
  const manifest = buildManifest();
  const safety = await verifyRawsqlSafety(manifest);
  const results = await runMatrix(manifest);
  writeFileSync(output, `${JSON.stringify({
    schemaVersion: 3,
    stage2FrozenSha: process.env.STAGE_2_FROZEN_SHA ?? 'a74858f346329ab90e67cfbc7369d256743276a3',
    environment: { node: process.version, platform: process.platform, poolMax, samples, counts, requestedConcurrency, connectionModels },
    canonicalSqlAsset: 'examples/postgres-ticket-queue-reference/src/tickets/get.sql',
    rawsql: { package: rawsqlPackage.name, version: rawsqlPackage.version, api: 'createPostgresTestkitClient' },
    safety,
    results,
  }, null, 2)}\n`);
  process.stdout.write(`Stage 3 parallelism evaluation passed; wrote ${output}.\n`);
} finally {
  await pool.end();
}

async function load(packageName) {
  const entry = path.join(rawsqlRoot, 'node_modules', ...packageName.split('/'), 'dist/index.js');
  return import(pathToFileURL(entry).href);
}

function buildManifest() {
  const resolver = new core.TableNameResolver({ defaultSchema: 'public', searchPath: ['public'] });
  const loader = new core.DdlFixtureLoader({ directories: [path.join(root, 'examples/postgres-ticket-queue-reference/db/ddl')], tableNameResolver: resolver });
  return { tableDefinitions: loader.getFixtures().map((fixture) => fixture.tableDefinition) };
}

function bindCase(caseFixture) {
  return bindNamedParameters(compiledCanonical, { id: String(caseFixture.id) });
}

function makeCases(count) {
  return Array.from({ length: count }, (_, index) => ({
    id: 10001 + index,
    customer_id: 9000 + index,
    subject: `parallel-case-${index + 1}`,
    status: 'open',
    priority: 'normal',
    assignee_id: null,
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    updated_at: new Date('2026-01-01T00:00:00.000Z'),
  }));
}

async function resetEmptySchema() {
  await setupTicketQueueDatabase(pool, { seedData: false });
}

async function insertCases(client, fixtures) {
  if (fixtures.length === 0) return;
  const values = [];
  const groups = fixtures.map((fixture, index) => {
    const offset = index * 8;
    values.push(fixture.id, fixture.customer_id, fixture.subject, fixture.status, fixture.priority, fixture.assignee_id, fixture.created_at, fixture.updated_at);
    return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8})`;
  });
  await client.query(`insert into tickets (id, customer_id, subject, status, priority, assignee_id, created_at, updated_at) values ${groups.join(', ')}`, values);
}

async function runMatrix(manifest) {
  const arms = {
    seededSharedFixture: runSeededSharedFixture,
    independentPhysicalFixture: runIndependentPhysicalFixture,
    rawsqlStatementLocalCte: runRawsqlStatementLocalCte,
  };
  const result = {};
  for (const [armName, runArm] of Object.entries(arms)) {
    result[armName] = [];
    for (const connectionModel of connectionModels) {
      for (const concurrency of requestedConcurrency) {
        for (const count of counts) {
          const runs = [];
          for (let sample = 0; sample < samples; sample += 1) {
            runs.push(await runArm({ manifest, connectionModel, concurrency, fixtures: makeCases(count) }));
          }
          result[armName].push({ connectionModel, requestedConcurrency: concurrency, count, runs, summary: summarizeRuns(runs) });
        }
      }
    }
  }
  return result;
}

async function runSeededSharedFixture({ connectionModel, concurrency, fixtures }) {
  const schemaStart = performance.now();
  await resetEmptySchema();
  await insertCases(pool, fixtures);
  const sharedFixtureSetupMs = performance.now() - schemaStart;
  return runCases({ arm: 'seededSharedFixture', connectionModel, concurrency, fixtures, sharedFixtureSetupMs });
}

async function runIndependentPhysicalFixture({ connectionModel, concurrency, fixtures }) {
  const schemaStart = performance.now();
  await resetEmptySchema();
  const schemaSetupMs = performance.now() - schemaStart;
  return runCases({ arm: 'independentPhysicalFixture', connectionModel, concurrency, fixtures, schemaSetupMs });
}

async function runRawsqlStatementLocalCte({ manifest, connectionModel, concurrency, fixtures }) {
  const schemaStart = performance.now();
  await resetEmptySchema();
  // This physical sentinel is never requested by complete CTE cases. A separate
  // negative control below requests it with missing fixture data.
  await insertCases(pool, [{ ...fixtures[0], id: 999999, subject: 'physical-sentinel' }]);
  const schemaSetupMs = performance.now() - schemaStart;
  const freshnessStart = performance.now();
  buildManifest();
  const manifestFreshnessMs = performance.now() - freshnessStart;
  return runCases({ arm: 'rawsqlStatementLocalCte', manifest, connectionModel, concurrency, fixtures, schemaSetupMs, manifestFreshnessMs });
}

async function runCases({ arm, manifest, connectionModel, concurrency, fixtures, ...fixedMetrics }) {
  const metrics = { acquisitionMs: 0, dbExecutionMs: 0, fixtureSetupMs: 0, fixtureCleanupMs: 0, rewriteAndFixtureMs: 0 };
  const singleClient = connectionModel === 'sharedSingleClient' ? await pool.connect() : null;
  const effectiveConcurrency = connectionModel === 'sharedSingleClient' ? 1 : concurrency;
  const wallStart = performance.now();
  try {
    await runConcurrent(fixtures, effectiveConcurrency, async (fixture) => {
      if (arm === 'seededSharedFixture') return runSeededCase(fixture, connectionModel, singleClient, metrics);
      if (arm === 'independentPhysicalFixture') return runIndependentPhysicalCase(fixture, connectionModel, singleClient, metrics);
      return runRawsqlCase(fixture, manifest, connectionModel, singleClient, metrics);
    });
  } finally {
    singleClient?.release();
  }
  return {
    ...fixedMetrics,
    wallMs: performance.now() - wallStart,
    effectiveConcurrency,
    metrics,
    failures: 0,
    crossTestContamination: 0,
  };
}

async function runSeededCase(fixture, connectionModel, singleClient, metrics) {
  const bound = bindCase(fixture);
  const result = await executeRead(connectionModel, singleClient, bound.sql, bound.values, metrics);
  assertFixtureResult(result, fixture);
}

async function runIndependentPhysicalCase(fixture, connectionModel, singleClient, metrics) {
  const { client, release } = await acquireClient(connectionModel, singleClient, metrics);
  try {
    const begin = performance.now();
    await client.query('begin');
    await insertCases(client, [fixture]);
    metrics.fixtureSetupMs += performance.now() - begin;
    const bound = bindCase(fixture);
    const queryStart = performance.now();
    const result = await client.query(bound.sql, [...bound.values]);
    metrics.dbExecutionMs += performance.now() - queryStart;
    assertFixtureResult(result, fixture);
  } finally {
    const cleanupStart = performance.now();
    await client.query('rollback');
    metrics.fixtureCleanupMs += performance.now() - cleanupStart;
    release();
  }
}

async function runRawsqlCase(fixture, manifest, connectionModel, singleClient, metrics) {
  const bound = bindCase(fixture);
  const executor = async (sql, params) => executeRead(connectionModel, singleClient, sql, params, metrics);
  const client = testkit.createPostgresTestkitClient({
    queryExecutor: executor,
    generated: manifest,
    tableRows: [{ tableName: 'tickets', rows: [fixture] }],
    defaultSchema: 'public',
    searchPath: ['public'],
    missingFixtureStrategy: 'error',
  });
  const rewriteStart = performance.now();
  const result = await client.query(bound.sql, [...bound.values]);
  metrics.rewriteAndFixtureMs += performance.now() - rewriteStart;
  assertFixtureResult(result, fixture);
}

async function executeRead(connectionModel, singleClient, sql, params, metrics) {
  if (connectionModel === 'sharedPool') {
    const start = performance.now();
    const result = await pool.query(sql, [...params]);
    metrics.dbExecutionMs += performance.now() - start;
    return result;
  }
  const { client, release } = await acquireClient(connectionModel, singleClient, metrics);
  try {
    const start = performance.now();
    const result = await client.query(sql, [...params]);
    metrics.dbExecutionMs += performance.now() - start;
    return result;
  } finally {
    release();
  }
}

async function acquireClient(connectionModel, singleClient, metrics) {
  if (singleClient) return { client: singleClient, release: () => {} };
  const start = performance.now();
  const client = await pool.connect();
  metrics.acquisitionMs += performance.now() - start;
  return { client, release: () => client.release() };
}

async function runConcurrent(items, concurrency, run) {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const index = next;
      next += 1;
      if (index >= items.length) return;
      await run(items[index]);
    }
  }));
}

function assertFixtureResult(result, fixture) {
  assert.equal(result.rows.length, 1);
  assert.equal(String(result.rows[0].id), String(fixture.id));
  assert.equal(result.rows[0].subject, fixture.subject);
  assert.equal(result.rows[0].customer_id, String(fixture.customer_id));
  assert.equal(result.rows[0].assignee_id, null);
}

async function verifyRawsqlSafety(manifest) {
  await resetEmptySchema();
  const sentinel = { ...makeCases(1)[0], id: 777777, subject: 'physical-fallback-sentinel' };
  await insertCases(pool, [sentinel]);
  const bound = bindCase(sentinel);
  const complete = testkit.createPostgresTestkitClient({ queryExecutor: (sql, params) => pool.query(sql, [...params]), generated: manifest, tableRows: [{ tableName: 'tickets', rows: [sentinel] }], defaultSchema: 'public', searchPath: ['public'], missingFixtureStrategy: 'error' });
  const completeResult = await complete.query(bound.sql, [...bound.values]);
  assertFixtureResult(completeResult, sentinel);
  const missingRows = testkit.createPostgresTestkitClient({ queryExecutor: (sql, params) => pool.query(sql, [...params]), generated: manifest, tableRows: [], defaultSchema: 'public', searchPath: ['public'], missingFixtureStrategy: 'error' });
  const fallbackResult = await missingRows.query(bound.sql, [...bound.values]);
  assert.equal(fallbackResult.rows[0]?.subject, sentinel.subject);
  return { completeFixture: 'fixture-only result verified', missingFixtureRows: 'physical fallback observed despite error strategy', physicalSentinel: sentinel.subject };
}

function summarizeRuns(runs) {
  const fields = ['wallMs', 'sharedFixtureSetupMs', 'schemaSetupMs', 'manifestFreshnessMs'];
  const metricFields = ['acquisitionMs', 'dbExecutionMs', 'fixtureSetupMs', 'fixtureCleanupMs', 'rewriteAndFixtureMs'];
  const summary = { effectiveConcurrency: runs[0].effectiveConcurrency, samples: runs.length };
  for (const field of fields) summary[field] = summarize(runs.map((run) => run[field]).filter((value) => value !== undefined));
  summary.metrics = {};
  for (const field of metricFields) summary.metrics[field] = summarize(runs.map((run) => run.metrics[field]));
  return summary;
}

function summarize(values) {
  if (values.length === 0) return undefined;
  const ordered = [...values].sort((a, b) => a - b);
  return { median: ordered[Math.floor(ordered.length / 2)], min: ordered[0], max: ordered.at(-1) };
}
