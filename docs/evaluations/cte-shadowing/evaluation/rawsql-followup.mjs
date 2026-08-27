// Second-stage evaluator. This is intentionally evaluation-only: rawsql-ts is
// loaded from a pinned external workspace and is not an Ashiba dependency.
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';
import { Pool } from 'pg';
import { compileNamedParameters } from '../../../../packages/named-parameters/dist/compiler.js';
import { bindNamedParameters } from '../../../../packages/named-parameters/dist/index.js';
import { setupTicketQueueDatabase } from '../../../../examples/postgres-ticket-queue-reference/scripts/setup-database.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../..');
const output = path.resolve(here, '..', 'rawsql-followup-results.json');
const databaseUrl = process.env.DATABASE_URL;
const rawsqlRoot = process.env.RAWSQL_TS_EVAL_ROOT;
if (!databaseUrl) throw new Error('DATABASE_URL is required.');
if (!rawsqlRoot) throw new Error('RAWSQL_TS_EVAL_ROOT must identify the pinned external rawsql-ts workspace.');

const testkit = await load('@rawsql-ts/testkit-postgres');
const core = await load('@rawsql-ts/testkit-core');
const rawsqlPackage = JSON.parse(readFileSync(path.join(rawsqlRoot, 'node_modules/@rawsql-ts/testkit-postgres/package.json'), 'utf8'));
const canonical = {
  get: read('examples/postgres-ticket-queue-reference/src/tickets/get.sql'),
  list: read('examples/postgres-ticket-queue-reference/src/tickets/list.sql'),
  join: read('docs/evaluations/cte-shadowing/evaluation/sql/join.sql'),
  existingCte: read('docs/evaluations/cte-shadowing/evaluation/sql/existing-cte.sql'),
};
const ticketRows = [
  { id: 1, customer_id: 10, subject: 'Cannot sign in', status: 'open', priority: 'normal', assignee_id: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 2, customer_id: 10, subject: 'Billing question', status: 'open', priority: 'urgent', assignee_id: 7, created_at: '2026-01-02T00:00:00Z', updated_at: '2026-01-02T00:00:00Z' },
  { id: 3, customer_id: 11, subject: 'Export issue', status: 'closed', priority: 'low', assignee_id: 8, created_at: '2026-01-03T00:00:00Z', updated_at: '2026-01-03T00:00:00Z' },
];
const eventRows = [{ id: 1, ticket_id: 1, actor_id: 7, note: 'opened', event_type: 'created' }];
const fixtureRows = [
  { tableName: 'tickets', rows: ticketRows },
  { tableName: 'ticket_events', rows: eventRows },
];
const pool = new Pool({ connectionString: databaseUrl });

try {
  const manifest = buildManifest();
  const equivalence = await verifySameSqlEquivalence(manifest);
  const shapes = await verifyRawsqlShapes(manifest);
  const safety = await verifySafety(manifest);
  const drift = verifyDriftAndFreshness(manifest);
  const benchmarkResult = await benchmark(manifest);
  const result = {
    schemaVersion: 2,
    rawsql: { package: rawsqlPackage.name, version: rawsqlPackage.version, api: 'createPostgresTestkitClient' },
    equivalence,
    shapes,
    safety,
    drift,
    benchmark: benchmarkResult,
  };
  writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
  process.stdout.write(`rawsql-ts follow-up evaluation passed; wrote ${output}.\n`);
} finally {
  await pool.end();
}

async function load(packageName) {
  const entry = path.join(rawsqlRoot, 'node_modules', ...packageName.split('/'), 'dist/index.js');
  return import(pathToFileURL(entry).href);
}

function read(relative) {
  return readFileSync(path.join(root, relative), 'utf8').replace(/\r\n?/g, '\n');
}

function bindCanonical(sql, input) {
  const compiled = compileNamedParameters(sql, { rendering: { style: 'indexed', prefix: '$' } });
  return bindNamedParameters(compiled, input);
}

function buildManifest(ddlDirectory = path.join(root, 'examples/postgres-ticket-queue-reference/db/ddl')) {
  const resolver = new core.TableNameResolver({ defaultSchema: 'public', searchPath: ['public'] });
  const loader = new core.DdlFixtureLoader({ directories: [ddlDirectory], tableNameResolver: resolver });
  return { tableDefinitions: loader.getFixtures().map((fixture) => fixture.tableDefinition) };
}

function rawsqlClient(manifest, rows = fixtureRows, { useGenerated = true, onExecute } = {}) {
  return testkit.createPostgresTestkitClient({
    queryExecutor: (sql, params) => pool.query(sql, [...params]),
    ...(useGenerated
      ? { generated: manifest }
      : { ddl: { directories: [path.join(root, 'examples/postgres-ticket-queue-reference/db/ddl')] } }),
    tableRows: rows,
    defaultSchema: 'public',
    searchPath: ['public'],
    missingFixtureStrategy: 'error',
    onExecute,
  });
}

async function verifySameSqlEquivalence(manifest) {
  await setupTicketQueueDatabase(pool, { seedData: true });
  await hydrateFixtureRowsFromSeed();
  const bound = bindCanonical(canonical.get, { id: '1' });
  const seeded = await pool.query(bound.sql, [...bound.values]);
  const rawsql = await rawsqlClient(manifest).query(bound.sql, [...bound.values]);
  assert.deepEqual(rawsql.rows, seeded.rows);
  assert.deepEqual(rawsql.fields.map((field) => field.name), seeded.fields.map((field) => field.name));
  assert.equal(typeof rawsql.rows[0]?.id, 'string');
  assert.ok(rawsql.rows[0]?.created_at instanceof Date);
  assert.equal(rawsql.rows[0]?.assignee_id, null);
  return { sqlAsset: 'examples/postgres-ticket-queue-reference/src/tickets/get.sql', fields: seeded.fields.map((field) => field.name), row: seeded.rows[0] };
}

async function verifyRawsqlShapes(manifest) {
  const client = rawsqlClient(manifest);
  const getBound = bindCanonical(canonical.get, { id: '1' });
  const get = await client.query(getBound.sql, [...getBound.values]);
  const listInput = { status: null, customerId: null, assigneeMode: 'any', assigneeId: null, limit: 10, offset: 0 };
  const listBound = bindCanonical(canonical.list, listInput);
  const list = await client.query(listBound.sql, [...listBound.values]);
  const joinBound = bindCanonical(canonical.join, { id: '1' });
  const join = await client.query(joinBound.sql, [...joinBound.values]);
  const existingBound = bindCanonical(canonical.existingCte, { status: 'open' });
  const existing = await client.query(existingBound.sql, [...existingBound.values]);
  const schemaQualifiedBound = bindCanonical(canonical.get.replace('from tickets', 'from public.tickets'), { id: '1' });
  const schemaQualified = await client.query(schemaQualifiedBound.sql, [...schemaQualifiedBound.values]);
  assert.equal(get.rows[0]?.id, '1');
  assert.equal(list.rows.length, 3);
  assert.equal(join.rows[0]?.note, 'opened');
  assert.deepEqual(existing.rows.map((row) => row.id), ['1', '2']);
  assert.equal(schemaQualified.rows[0]?.id, '1');
  return { get: 'pass', optionalListAndRepeatedParameter: 'pass', joinAndAlias: 'pass', existingWith: 'pass', schemaQualified: 'pass' };
}

async function verifySafety(manifest) {
  await setupTicketQueueDatabase(pool, { seedData: true });
  await hydrateFixtureRowsFromSeed();
  await pool.query("insert into tickets (id, customer_id, subject, status, priority, assignee_id, created_at, updated_at) values (999, 99, 'physical-sentinel', 'open', 'normal', null, now(), now())");
  await pool.query("insert into ticket_events (ticket_id, actor_id, note, event_type) values (999, 1, 'physical-event', 'created')");
  const full = rawsqlClient(manifest);
  const qualified = await full.query(canonical.get.replace('from tickets', 'from public.tickets'), ['1']);
  assert.equal(qualified.rows.some((row) => row.id === '999'), false);
  const executed = [];
  const noTicketRows = await rawsqlClient(manifest, [], { onExecute: (sql, params, fixtures) => executed.push({ sql, params, fixtures }) }).query(bindCanonical(canonical.get, { id: '1' }).sql, ['1']);
  assert.equal(noTicketRows.rows[0]?.id, '1');
  assert.deepEqual(executed[0]?.fixtures, []);
  const partialJoin = await rawsqlClient(manifest, [{ tableName: 'tickets', rows: ticketRows }]).query(bindCanonical(canonical.join, { id: '1' }).sql, ['1']);
  assert.equal(partialJoin.rows[0]?.note, null);
  const noDefinition = await rawsqlClient({ tableDefinitions: [] }, []).query(bindCanonical(canonical.get, { id: '1' }).sql, ['1']);
  assert.equal(noDefinition.rows[0]?.id, '1');
  return { unqualified: 'fixture-only', schemaQualified: 'fixture-only', missingRows: 'physical fallback despite error strategy', partialJoinRows: 'typed-empty CTE (no physical fallback)', missingTableDefinition: 'physical fallback despite error strategy' };
}

function verifyDriftAndFreshness(manifest) {
  const temporary = mkdtempSync(path.join(tmpdir(), 'rawsql-cte-drift-'));
  try {
    const schema = read('examples/postgres-ticket-queue-reference/db/ddl/schema.sql');
    const cases = {
      columnRename: schema.replace('subject text not null', 'title text not null'),
      columnRemoval: schema.replace('  subject text not null,\n', ''),
      bigintToUuid: schema.replace('id bigint primary key', 'id uuid primary key'),
      addedRequired: schema.replace('  updated_at timestamptz not null default now()\n', '  updated_at timestamptz not null default now(),\n  queue text not null\n'),
      notNullToNullable: schema.replace('subject text not null', 'subject text'),
      nullableToNotNull: schema.replace('assignee_id bigint,', 'assignee_id bigint not null,'),
    };
    const result = {};
    for (const [name, sql] of Object.entries(cases)) {
      const directory = path.join(temporary, name);
      mkdirSync(directory, { recursive: true });
      writeFileSync(path.join(directory, 'schema.sql'), sql);
      const changed = buildManifest(directory);
      result[name] = { manifestChanged: JSON.stringify(changed) !== JSON.stringify(manifest) };
    }
    // A client receiving a stale generated manifest still trusts it; normal
    // safety therefore needs a regeneration/diff freshness command.
    const freshnessStart = performance.now();
    const changedManifest = buildManifest(path.join(temporary, 'bigintToUuid'));
    const freshnessMs = performance.now() - freshnessStart;
    assert.notDeepEqual(changedManifest, manifest);
    assert.equal(result.notNullToNullable.manifestChanged, false);
    assert.equal(result.nullableToNotNull.manifestChanged, false);
    return { cases: result, staleManifestNeedsFreshnessCheck: true, freshnessMs };
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

async function benchmark(manifest) {
  const counts = [1, 10, 50, 100, 300];
  const samples = 7;
  const records = {};
  const input = { id: '1' };
  for (const count of counts) {
    records[count] = { seeded: [], handBuilt: [], rawsql: [], rawsqlWithFreshness: [] };
    for (let sample = 0; sample < samples; sample += 1) {
      const setupStart = performance.now();
      await setupTicketQueueDatabase(pool, { seedData: true });
      const setupMs = performance.now() - setupStart;
      await hydrateFixtureRowsFromSeed();
      const prepStart = performance.now();
      const bound = bindCanonical(canonical.get, input);
      const preparationMs = performance.now() - prepStart;
      const seededStart = performance.now();
      for (let i = 0; i < count; i += 1) await pool.query(bound.sql, [...bound.values]);
      records[count].seeded.push({ setupMs, preparationMs, executionMs: performance.now() - seededStart });

      const handStart = performance.now();
      const manualSql = await handBuiltSql(bound);
      const handRewriteMs = performance.now() - handStart;
      const handExecStart = performance.now();
      for (let i = 0; i < count; i += 1) await pool.query(manualSql.sql, manualSql.values);
      records[count].handBuilt.push({ rewriteMs: handRewriteMs, executionMs: performance.now() - handExecStart });

      const rawCreateStart = performance.now();
      const raw = rawsqlClient(manifest);
      const rawCreateMs = performance.now() - rawCreateStart;
      const rawExecStart = performance.now();
      for (let i = 0; i < count; i += 1) await raw.query(bound.sql, [...bound.values]);
      records[count].rawsql.push({ rewriteSetupMs: rawCreateMs, executionMs: performance.now() - rawExecStart });

      const freshnessStart = performance.now();
      buildManifest();
      const freshnessMs = performance.now() - freshnessStart;
      records[count].rawsqlWithFreshness.push({ freshnessMs, rewriteSetupMs: rawCreateMs, executionMs: records[count].rawsql.at(-1).executionMs });
    }
  }
  return { samples, counts: records };
}

async function hydrateFixtureRowsFromSeed() {
  const physical = await pool.query('select id, customer_id, subject, status, priority, assignee_id, created_at, updated_at from tickets where id in (1, 2, 3) order by id');
  assert.equal(physical.rows.length, ticketRows.length);
  for (let index = 0; index < ticketRows.length; index += 1) Object.assign(ticketRows[index], physical.rows[index]);
}

async function handBuiltSql(bound) {
  const values = ticketRows.flatMap((row) => [row.id, row.customer_id, row.subject, row.status, row.priority, row.assignee_id, row.created_at, row.updated_at]);
  const groups = ticketRows.map((_, index) => `(${['bigint', 'bigint', 'text', 'text', 'text', 'bigint', 'timestamptz', 'timestamptz'].map((type, col) => `$${index * 8 + col + 1}::${type}`).join(', ')})`);
  const shifted = bound.sql.replace(/\$(\d+)/g, (_, index) => `$${Number(index) + values.length}`);
  return { sql: `with tickets(id, customer_id, subject, status, priority, assignee_id, created_at, updated_at) as (values ${groups.join(', ')})\n${shifted}`, values: [...values, ...bound.values] };
}
