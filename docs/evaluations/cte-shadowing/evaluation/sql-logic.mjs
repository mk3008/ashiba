// Stage 4 evaluation-only harness. rawsql-ts is loaded from a pinned external
// workspace; no Ashiba package dependency, API, or wrapper is introduced.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Pool } from 'pg';
import { compileNamedParameters } from '../../../../packages/named-parameters/dist/compiler.js';
import { bindNamedParameters } from '../../../../packages/named-parameters/dist/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../..');
const evaluationRoot = path.join(root, 'docs/evaluations/cte-shadowing/evaluation');
const output = path.join(root, 'docs/evaluations/cte-shadowing/sql-logic-results.json');
const databaseUrl = process.env.DATABASE_URL;
const rawsqlRoot = process.env.RAWSQL_TS_EVAL_ROOT;
if (!databaseUrl) throw new Error('DATABASE_URL is required.');
if (!rawsqlRoot) throw new Error('RAWSQL_TS_EVAL_ROOT must identify the pinned external rawsql-ts workspace.');

const testkit = await load('@rawsql-ts/testkit-postgres');
const core = await load('@rawsql-ts/testkit-core');
const rawsqlPackage = JSON.parse(readFileSync(path.join(rawsqlRoot, 'node_modules/@rawsql-ts/testkit-postgres/package.json'), 'utf8'));
const schemaSql = read('sql-logic-schema.sql');
const scales = ['S', 'M', 'L', 'XL'];
const scenarioCounts = [10, 50, 100];
const concurrencyLevels = [1, 4, 8];
const samples = 3;
const poolMax = 8;
const canonical = Object.fromEntries(scales.map((scale) => [scale, read(`sql-logic/${scale.toLowerCase()}.sql`)]));
const compiled = Object.fromEntries(scales.map((scale) => [scale, compileNamedParameters(canonical[scale], { rendering: { style: 'indexed', prefix: '$' } })]));
const pool = new Pool({ connectionString: databaseUrl, max: poolMax });

try {
  const manifest = buildManifest();
  const safety = await verifyPhysicalFallback(manifest);
  const apiProbe = await comparePublicFixturePaths(manifest);
  const results = await runMatrix(manifest);
  writeFileSync(output, `${JSON.stringify({
    schemaVersion: 4,
    stage4StartingSha: process.env.STAGE_4_STARTING_SHA ?? '85aee431c1bdfda79a0643f7bfaeeeac3f6ad728',
    environment: { node: process.version, platform: process.platform, poolMax, samples, scenarioCounts, concurrencyLevels },
    rawsql: { package: rawsqlPackage.name, version: rawsqlPackage.version, api: 'createPostgresTestkitClient().withFixtures(...)' },
    scaleDefinitions: Object.fromEntries(scales.map((scale) => [scale, describeScale(scale)])),
    safety,
    apiProbe,
    results,
  }, null, 2)}\n`);
  process.stdout.write(`Stage 4 SQL logic evaluation passed; wrote ${output}.\n`);
} finally {
  await pool.end();
}

function read(relative) {
  return readFileSync(path.join(evaluationRoot, relative), 'utf8').replace(/\r\n?/g, '\n');
}

async function load(packageName) {
  const entry = path.join(rawsqlRoot, 'node_modules', ...packageName.split('/'), 'dist/index.js');
  return import(pathToFileURL(entry).href);
}

function buildManifest() {
  const resolver = new core.TableNameResolver({ defaultSchema: 'public', searchPath: ['public'] });
  const loader = new core.DdlFixtureLoader({ directories: [evaluationRoot], tableNameResolver: resolver });
  return { tableDefinitions: loader.getFixtures().map((fixture) => fixture.tableDefinition) };
}

async function resetSchema() {
  await pool.query('drop schema public cascade; create schema public');
  for (const statement of schemaSql.split(';').map((part) => part.trim()).filter(Boolean)) await pool.query(statement);
}

function describeScale(scale) {
  const scenario = makeScenario(scale, 0);
  return {
    relations: scenario.fixtures.length,
    rows: scenario.fixtures.reduce((sum, fixture) => sum + fixture.rows.length, 0),
    fixtureInputBytes: byteLength(scenario.fixtures),
    canonicalSqlBytes: Buffer.byteLength(canonical[scale]),
    tables: scenario.fixtures.map((fixture) => fixture.tableName),
  };
}

function makeScenario(scale, index, { forceEligible = false, tokenPrefix = 'logic', priorityOverride } = {}) {
  const base = 1_000_000 + index * 1_000;
  const token = `${tokenPrefix}-${scale}-${index}`;
  const mode = forceEligible ? 'eligible' : ['eligible', 'insufficient', 'blocked', 'shipped'][index % 4];
  const winnerId = mode === 'eligible' ? base + 1 : null;
  const winnerPriority = winnerId === null ? null : (priorityOverride ?? 20);
  const customers = [{ id: base + 10, scenario_token: token, blocked: mode === 'blocked' }, { id: base + 11, scenario_token: token, blocked: false }, { id: base + 12, scenario_token: token, blocked: false }];
  const warehouses = [{ id: base + 20, scenario_token: token, active: true }, { id: base + 21, scenario_token: token, active: true }, { id: base + 22, scenario_token: token, active: false }];
  const orders = [
    { id: base + 1, scenario_token: token, customer_id: base + 10, warehouse_id: base + 20, status: mode === 'insufficient' && scale === 'S' ? 'closed' : 'open', priority: winnerPriority ?? 5 },
    { id: base + 2, scenario_token: token, customer_id: base + 11, warehouse_id: base + 21, status: 'closed', priority: 1 },
    { id: base + 3, scenario_token: token, customer_id: base + 12, warehouse_id: base + 22, status: 'closed', priority: 1 },
  ];
  const itemCount = scale === 'XL' ? 20 : scale === 'L' ? 12 : 0;
  const orderItems = Array.from({ length: itemCount }, (_, row) => ({ id: base + 100 + row, scenario_token: token, order_id: base + 1, product_id: base + 300 + row, quantity: 1 }));
  const inventory = orderItems.map((item, row) => ({ id: base + 200 + row, scenario_token: token, warehouse_id: base + 20, product_id: item.product_id, available_qty: (mode === 'insufficient' || (scale === 'L' && mode === 'shipped')) && row === 0 ? 0 : 2 }));
  const productRules = scale === 'XL' ? orderItems.map((item, row) => ({ id: base + 400 + row, scenario_token: token, product_id: item.product_id, enabled: true, priority: 100 - row })) : [];
  const payments = scale === 'S' || scale === 'L' ? [] : Array.from({ length: scale === 'XL' ? 15 : 7 }, (_, row) => ({ id: base + 500 + row, scenario_token: token, order_id: row === 0 ? base + 1 : base + 2, status: row === 0 && mode === 'eligible' ? 'paid' : 'pending' }));
  const shipments = scale === 'XL' ? Array.from({ length: 15 }, (_, row) => ({ id: base + 600 + row, scenario_token: token, order_id: row === 0 ? base + 1 : base + 2, status: row === 0 && mode === 'shipped' ? 'shipped' : 'queued' })) : [];
  const fixturesByScale = {
    S: [{ tableName: 'orders', rows: orders }],
    M: [{ tableName: 'orders', rows: orders }, { tableName: 'payments', rows: payments }],
    L: [{ tableName: 'customers', rows: customers }, { tableName: 'orders', rows: orders }, { tableName: 'order_items', rows: orderItems }, { tableName: 'inventory', rows: inventory }],
    XL: [{ tableName: 'customers', rows: customers }, { tableName: 'warehouses', rows: warehouses }, { tableName: 'orders', rows: orders }, { tableName: 'order_items', rows: orderItems }, { tableName: 'inventory', rows: inventory }, { tableName: 'product_rules', rows: productRules }, { tableName: 'payments', rows: payments }, { tableName: 'shipments', rows: shipments }],
  };
  return { scale, token, winnerId, winnerPriority, fixtures: fixturesByScale[scale] };
}

function bindScenario(scenario) {
  return bindNamedParameters(compiled[scenario.scale], { token: scenario.token });
}

async function runMatrix(manifest) {
  const result = {};
  for (const scale of scales) {
    result[scale] = [];
    for (const count of scenarioCounts) {
      for (const concurrency of concurrencyLevels) {
        const physicalRuns = [];
        const cteRuns = [];
        for (let sample = 0; sample < samples; sample += 1) {
          const scenarios = Array.from({ length: count }, (_, index) => makeScenario(scale, index));
          physicalRuns.push(await runPhysical(scenarios, concurrency));
          cteRuns.push(await runCte(scenarios, concurrency, manifest));
        }
        result[scale].push({ count, concurrency, physicalRuns, cteRuns, physical: summarizeRuns(physicalRuns), cte: summarizeRuns(cteRuns) });
      }
    }
  }
  return result;
}

async function runPhysical(scenarios, concurrency) {
  await resetSchema();
  const metrics = emptyMetrics();
  const wallStart = performance.now();
  await runConcurrent(scenarios, concurrency, async (scenario) => {
    const acquisitionStart = performance.now();
    const client = await pool.connect();
    metrics.connectionAcquireMs += performance.now() - acquisitionStart;
    try {
      const beginStart = performance.now();
      await client.query('begin');
      metrics.transactionBeginMs += performance.now() - beginStart;
      const fixtureStart = performance.now();
      const insertBytes = await insertFixtures(client, scenario.fixtures);
      metrics.fixtureInsertMs += performance.now() - fixtureStart;
      metrics.physicalInsertPayloadBytes += insertBytes;
      const bound = bindScenario(scenario);
      const queryStart = performance.now();
      const result = await client.query(bound.sql, [...bound.values]);
      metrics.queryExecutionMs += performance.now() - queryStart;
      assertLogicResult(result, scenario);
    } finally {
      const rollbackStart = performance.now();
      await client.query('rollback');
      metrics.rollbackMs += performance.now() - rollbackStart;
      client.release();
    }
  });
  return { wallMs: performance.now() - wallStart, metrics, failures: 0, crossScenarioContamination: 0 };
}

async function runCte(scenarios, concurrency, manifest) {
  await resetSchema();
  const metrics = emptyMetrics();
  const baseStart = performance.now();
  const baseClient = testkit.createPostgresTestkitClient({
    queryExecutor: async (sql, params) => {
      metrics.generatedCteSqlBytes += Buffer.byteLength(sql);
      const queryStart = performance.now();
      const result = await pool.query(sql, [...params]);
      metrics.queryExecutionMs += performance.now() - queryStart;
      return result;
    },
    generated: manifest,
    defaultSchema: 'public',
    searchPath: ['public'],
    missingFixtureStrategy: 'error',
  });
  metrics.baseClientInitMs = performance.now() - baseStart;
  const wallStart = performance.now();
  await runConcurrent(scenarios, concurrency, async (scenario) => {
    const fixtureStart = performance.now();
    const scoped = baseClient.withFixtures(scenario.fixtures);
    metrics.fixtureConstructionMs += performance.now() - fixtureStart;
    const bound = bindScenario(scenario);
    const totalStart = performance.now();
    const result = await scoped.query(bound.sql, [...bound.values]);
    metrics.rewriteAndQueryMs += performance.now() - totalStart;
    assertLogicResult(result, scenario);
  });
  return { wallMs: performance.now() - wallStart, metrics, failures: 0, crossScenarioContamination: 0 };
}

async function insertFixtures(client, fixtures) {
  let bytes = 0;
  for (const fixture of fixtures) {
    if (fixture.rows.length === 0) continue;
    const columns = Object.keys(fixture.rows[0]);
    const values = [];
    const groups = fixture.rows.map((row, rowIndex) => {
      for (const column of columns) values.push(row[column]);
      const offset = rowIndex * columns.length;
      return `(${columns.map((_, columnIndex) => `$${offset + columnIndex + 1}`).join(', ')})`;
    });
    const sql = `insert into ${fixture.tableName} (${columns.join(', ')}) values ${groups.join(', ')}`;
    bytes += Buffer.byteLength(sql) + byteLength(values);
    await client.query(sql, values);
  }
  return bytes;
}

function assertLogicResult(result, scenario) {
  if (scenario.winnerId === null) {
    assert.equal(result.rows.length, 0, `scenario ${scenario.token} should not select an order`);
    return;
  }
  assert.equal(result.rows.length, 1, `scenario ${scenario.token} should select exactly one order`);
  assert.equal(String(result.rows[0].id), String(scenario.winnerId));
  assert.equal(result.rows[0].scenario_token, scenario.token);
  assert.equal(result.rows[0].priority, scenario.winnerPriority);
}

async function comparePublicFixturePaths(manifest) {
  const scenario = makeScenario('XL', 999, { forceEligible: true, tokenPrefix: 'api-probe' });
  await resetSchema();
  const base = testkit.createPostgresTestkitClient({ queryExecutor: (sql, params) => pool.query(sql, [...params]), generated: manifest, defaultSchema: 'public', searchPath: ['public'], missingFixtureStrategy: 'error' });
  const bound = bindScenario(scenario);
  const samples = { withFixtures: [], newClient: [] };
  for (let index = 0; index < 5; index += 1) {
    let start = performance.now();
    assertLogicResult(await base.withFixtures(scenario.fixtures).query(bound.sql, [...bound.values]), scenario);
    samples.withFixtures.push(performance.now() - start);
    start = performance.now();
    const fresh = testkit.createPostgresTestkitClient({ queryExecutor: (sql, params) => pool.query(sql, [...params]), generated: manifest, tableRows: scenario.fixtures, defaultSchema: 'public', searchPath: ['public'], missingFixtureStrategy: 'error' });
    assertLogicResult(await fresh.query(bound.sql, [...bound.values]), scenario);
    samples.newClient.push(performance.now() - start);
  }
  return { primary: 'base client + withFixtures', samples, medianMs: { withFixtures: median(samples.withFixtures), newClient: median(samples.newClient) } };
}

async function verifyPhysicalFallback(manifest) {
  await resetSchema();
  const physical = makeScenario('XL', 777, { forceEligible: true, priorityOverride: 77, tokenPrefix: 'physical-sentinel' });
  const completeScenario = makeScenario('XL', 777, { forceEligible: true, priorityOverride: 20, tokenPrefix: 'physical-sentinel' });
  await insertFixtures(pool, physical.fixtures);
  const bound = bindScenario(completeScenario);
  const complete = testkit.createPostgresTestkitClient({ queryExecutor: (sql, params) => pool.query(sql, [...params]), generated: manifest, tableRows: completeScenario.fixtures, defaultSchema: 'public', searchPath: ['public'], missingFixtureStrategy: 'error' });
  assertLogicResult(await complete.query(bound.sql, [...bound.values]), completeScenario);
  const applied = [];
  const incomplete = testkit.createPostgresTestkitClient({ queryExecutor: (sql, params) => pool.query(sql, [...params]), generated: manifest, tableRows: [], defaultSchema: 'public', searchPath: ['public'], missingFixtureStrategy: 'error', onExecute: (_sql, _params, fixtures) => applied.push(fixtures) });
  assertLogicResult(await incomplete.query(bound.sql, [...bound.values]), physical);
  assert.deepEqual(applied[0], []);
  return { completeFixture: 'fixture-only priority-20 result verified against a priority-77 physical sentinel with the same token', incompleteFixture: 'physical fallback observed despite error strategy', sentinelToken: physical.token };
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

function emptyMetrics() {
  return { connectionAcquireMs: 0, transactionBeginMs: 0, fixtureInsertMs: 0, rollbackMs: 0, queryExecutionMs: 0, fixtureConstructionMs: 0, rewriteAndQueryMs: 0, generatedCteSqlBytes: 0, physicalInsertPayloadBytes: 0, baseClientInitMs: 0 };
}

function summarizeRuns(runs) {
  const fields = ['wallMs'];
  const metricFields = Object.keys(emptyMetrics());
  const result = { samples: runs.length };
  for (const field of fields) result[field] = summary(runs.map((run) => run[field]));
  result.metrics = {};
  for (const field of metricFields) result.metrics[field] = summary(runs.map((run) => run.metrics[field]));
  return result;
}

function summary(values) {
  const ordered = [...values].sort((a, b) => a - b);
  return { median: ordered[Math.floor(ordered.length / 2)], min: ordered[0], max: ordered.at(-1) };
}

function median(values) { return summary(values).median; }
function byteLength(value) { return Buffer.byteLength(JSON.stringify(value)); }
