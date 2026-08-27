import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { Pool } from 'pg';
// This evaluation directory is intentionally outside a published package. Use
// the locally built artifact rather than adding a root dependency only for it.
import { compileNamedParameters } from '../../../../packages/named-parameters/dist/compiler.js';
import { bindNamedParameters } from '../../../../packages/named-parameters/dist/index.js';
import { setupTicketQueueDatabase } from '../../../../examples/postgres-ticket-queue-reference/scripts/setup-database.mjs';

const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, '../../../..');
const out = path.resolve(directory, '..', 'benchmark-results.json');
const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required for this real PostgreSQL evaluation.');

const canonical = {
  get: read('examples/postgres-ticket-queue-reference/src/tickets/get.sql'),
  list: read('examples/postgres-ticket-queue-reference/src/tickets/list.sql'),
  join: read('docs/evaluations/cte-shadowing/evaluation/sql/join.sql'),
  existingCte: read('docs/evaluations/cte-shadowing/evaluation/sql/existing-cte.sql'),
};

const rows = {
  tickets: [
    [1, 10, 'Cannot sign in', 'open', 'normal', null, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'],
    [2, 10, 'Billing question', 'open', 'urgent', 7, '2026-01-02T00:00:00Z', '2026-01-02T00:00:00Z'],
    [3, 11, 'Export issue', 'closed', 'low', 8, '2026-01-03T00:00:00Z', '2026-01-03T00:00:00Z'],
  ],
  ticketEvents: [[1, 1, 7, 'opened', 'created']],
};
const ticketColumns = ['id', 'customer_id', 'subject', 'status', 'priority', 'assignee_id', 'created_at', 'updated_at'];
const eventColumns = ['id', 'ticket_id', 'actor_id', 'note', 'event_type'];
const ticketTypes = ['bigint', 'bigint', 'text', 'text', 'text', 'bigint', 'timestamptz', 'timestamptz'];
const eventTypes = ['bigint', 'bigint', 'bigint', 'text', 'text'];

const pool = new Pool({ connectionString: url });
try {
  await verifyShapesAndSafety();
  verifyDdlDriftGuard();
  const benchmarkResult = await benchmark();
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(benchmarkResult, null, 2)}\n`);
  process.stdout.write(`CTE shadowing evaluation passed; wrote ${out}.\n`);
} finally {
  await pool.end();
}

function read(relative) {
  return readFileSync(path.join(root, relative), 'utf8').replace(/\r\n?/g, '\n');
}

function fixtureCte(name, columns, types, relationRows, offset) {
  const values = relationRows.flatMap((row, rowIndex) => row.map((_, columnIndex) => `$${offset + rowIndex * columns.length + columnIndex + 1}::${types[columnIndex]}`));
  const groups = relationRows.map((_, rowIndex) => `(${values.slice(rowIndex * columns.length, (rowIndex + 1) * columns.length).join(', ')})`);
  return `${name}(${columns.join(', ')}) as (values ${groups.join(', ')})`;
}

// Intentionally narrow textual transformation. It handles a leading ordinary
// WITH by prepending CTEs; it does not claim schema-qualified, recursive, or
// dollar-quoted SQL support. Those limitations are evidence, not product debt.
function prefixCtes(sql, ctes) {
  if (ctes.length === 0) return sql;
  const prefix = ctes.join(', ');
  // A function replacer is required: fixture placeholders such as `$1` must
  // not be interpreted as replacement-string capture references.
  if (/^\s*with\s+/i.test(sql)) return sql.replace(/^(\s*with\s+)/i, (match) => `${match}${prefix}, `);
  return `with ${prefix}\n${sql}`;
}

function shiftDollarParameters(sql, offset) {
  return sql.replace(/\$(\d+)/g, (_, index) => `$${Number(index) + offset}`);
}

function prepare(sql, input, relations = ['tickets']) {
  const compiled = compileNamedParameters(sql, { rendering: { style: 'indexed', prefix: '$' } });
  const bound = bindNamedParameters(compiled, input);
  const fixtureValues = [];
  const ctes = [];
  for (const relation of relations) {
    if (relation === 'tickets') {
      ctes.push(fixtureCte('tickets', ticketColumns, ticketTypes, rows.tickets, fixtureValues.length));
      fixtureValues.push(...rows.tickets.flat());
    } else if (relation === 'ticket_events') {
      ctes.push(fixtureCte('ticket_events', eventColumns, eventTypes, rows.ticketEvents, fixtureValues.length));
      fixtureValues.push(...rows.ticketEvents.flat());
    } else {
      throw new Error(`Unknown fixture relation: ${relation}`);
    }
  }
  return { sql: prefixCtes(shiftDollarParameters(bound.sql, fixtureValues.length), ctes), values: [...fixtureValues, ...bound.values] };
}

async function shadowQuery(sql, input, relations) {
  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query('set local search_path = pg_temp');
    const prepared = prepare(sql, input, relations);
    try {
      return await client.query(prepared.sql, prepared.values);
    } catch (error) {
      error.message = `${error.message}\nCTE-shadowed SQL:\n${prepared.sql}`;
      throw error;
    }
  } finally {
    await client.query('rollback').catch(() => {});
    client.release();
  }
}

async function verifyShapesAndSafety() {
  const get = await shadowQuery(canonical.get, { id: '1' }, ['tickets']);
  assert.equal(get.rows[0].id, '1'); // PostgreSQL bigint through the real pg driver
  assert.ok(get.rows[0].created_at instanceof Date); // timestamptz representation

  const list = await shadowQuery(canonical.list, { status: null, customerId: null, assigneeMode: 'any', assigneeId: null, limit: 10, offset: 0 }, ['tickets']);
  assert.equal(list.rows.length, 3); // repeated logical named parameters remain bound by the source compiler
  assert.equal(list.rows[0].assignee_id, null); // nullable DTO-compatible value

  const join = await shadowQuery(canonical.join, { id: '1' }, ['tickets', 'ticket_events']);
  assert.equal(join.rows[0].note, 'opened');
  const existing = await shadowQuery(canonical.existingCte, { status: 'open' }, ['tickets']);
  assert.deepEqual(existing.rows.map((row) => row.id), ['1', '2']);

  await assert.rejects(() => shadowQuery(canonical.get, { id: '1' }, []), /relation .*tickets.* does not exist/i);
  await assert.rejects(() => shadowQuery(canonical.join, { id: '1' }, ['tickets']), /relation .*ticket_events.* does not exist/i);
}

// This is deliberately not a general DDL parser. It is the smallest guard for
// this two-relation experiment and makes its blind spot explicit: nullability
// and constraints are not represented by a CTE value list and therefore need
// seeded/integration coverage.
function verifyDdlDriftGuard() {
  const ddl = read('examples/postgres-ticket-queue-reference/db/ddl/schema.sql');
  assertFixtureMatchesDdl(ddl, 'tickets', ticketColumns, ticketTypes);
  assertFixtureMatchesDdl(ddl, 'ticket_events', eventColumns, eventTypes);
  assert.throws(() => assertFixtureMatchesDdl(ddl.replace('id bigint primary key', 'id uuid primary key'), 'tickets', ticketColumns, ticketTypes));
  assert.throws(() => assertFixtureMatchesDdl(ddl.replace('updated_at timestamptz not null default now()\n);', 'updated_at timestamptz not null default now(),\n  queue text not null\n);'), 'tickets', ticketColumns, ticketTypes));
  // A nullable/constraint-only change remains invisible to this structural
  // guard: it is recorded as a false-green boundary, not silently claimed safe.
  assertFixtureMatchesDdl(ddl.replace('subject text not null', 'subject text'), 'tickets', ticketColumns, ticketTypes);
}

function assertFixtureMatchesDdl(ddl, relation, columns, types) {
  const match = ddl.match(new RegExp(`create table ${relation} \\(([\\s\\S]*?)\\n\\);`, 'i'));
  if (!match) throw new Error(`Could not locate ${relation} DDL.`);
  const actual = match[1].split(',\n')
    .filter((line) => !/^\s*(primary key|foreign key|constraint|check)/i.test(line))
    .map((line) => {
      const [name, type] = line.trim().split(/\s+/, 3);
      return [name, type === 'bigserial' ? 'bigint' : type];
    });
  assert.deepEqual(actual, columns.map((name, index) => [name, types[index]]), `${relation} fixture signature drifted from DDL`);
}

async function benchmark() {
  const counts = [1, 10, 50, 100, 300];
  const samples = 7;
  const result = { schemaVersion: 1, samples, counts: {}, environment: { node: process.version, platform: process.platform } };
  for (const count of counts) {
    const seeded = [];
    const shadowed = [];
    for (let sample = 0; sample < samples; sample += 1) {
      const client = await pool.connect();
      try {
        const setupStart = performance.now();
        await setupTicketQueueDatabase(client, { seedData: true });
        const setupMs = performance.now() - setupStart;
        const executionStart = performance.now();
        for (let i = 0; i < count; i += 1) await client.query('select id, created_at from tickets where id = $1', ['1']);
        seeded.push({ setupMs, executionMs: performance.now() - executionStart });
      } finally { client.release(); }

      const transformStart = performance.now();
      const prepared = prepare(canonical.get, { id: '1' }, ['tickets']);
      const transformMs = performance.now() - transformStart;
      const executionStart = performance.now();
      const client2 = await pool.connect();
      try {
        await client2.query('begin');
        await client2.query('set local search_path = pg_temp');
        for (let i = 0; i < count; i += 1) await client2.query(prepared.sql, prepared.values);
        shadowed.push({ transformMs, executionMs: performance.now() - executionStart, sqlBytes: Buffer.byteLength(prepared.sql) });
      } finally { await client2.query('rollback').catch(() => {}); client2.release(); }
    }
    result.counts[count] = { seeded, shadowed };
  }
  return result;
}
