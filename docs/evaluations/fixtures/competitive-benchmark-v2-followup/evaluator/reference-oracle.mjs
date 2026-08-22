import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import pg from 'pg';
import { createFixture, dropFixture, SCHEMA_RE, state, qi } from '../reference/common/fixture.mjs';
import { claim, connect, deepOffsetPage, keysetPage, transfer } from '../reference/common/reference-application.mjs';

const { Client } = pg;
const fail = (message) => { throw new Error(message); };
const assert = (condition, message) => { if (!condition) fail(message); };
const message = (error) => error instanceof Error ? error.message : String(error);
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
async function rejects(action, label) { try { await action(); } catch (error) { return { status: 'rejected', message: message(error) }; } fail(`${label}: expected rejection`); }
function planNodes(plan) { const nodes = []; const visit = (node) => { if (!node || typeof node !== 'object') return; nodes.push(node); for (const child of node.Plans ?? []) visit(child); }; for (const root of plan ?? []) visit(root.Plan); return nodes; }
function rowsVisited(plan) { return Math.max(0, ...planNodes(plan).map((node) => Number(node['Actual Rows'] ?? 0))); }

export async function evaluateT1(databaseUrl, schema) {
  const client = await connect(databaseUrl); try { assert((await transfer(client, schema, { fromAccountId: '7001', toAccountId: '7002', amountCents: '1250', note: 'reference-success' })).applied, 'T1 success did not report applied=true'); } finally { await client.end(); }
  const success = await state(databaseUrl, schema);
  assert(same(success.accounts, [{ account_id: '7001', balance_cents: '8750' }, { account_id: '7002', balance_cents: '6250' }]), 'T1 successful final balances mismatch');
  assert(success.audit.length === 1, 'T1 successful transfer must write one audit row');
  const insufficient = await connect(databaseUrl); try { await rejects(() => transfer(insufficient, schema, { fromAccountId: '7001', toAccountId: '7002', amountCents: '999999', note: 'insufficient' }), 'T1 insufficient funds'); } finally { await insufficient.end(); }
  const afterInsufficient = await state(databaseUrl, schema); assert(same(afterInsufficient.accounts, success.accounts) && same(afterInsufficient.audit, success.audit), 'T1 insufficient funds retained state');
  const forced = await connect(databaseUrl); try { await rejects(() => transfer(forced, schema, { fromAccountId: '7001', toAccountId: '7002', amountCents: '500', failAfterDebit: true, note: 'forced-failure' }), 'T1 forced failure'); } finally { await forced.end(); }
  const final = await state(databaseUrl, schema); assert(same(final.accounts, success.accounts) && same(final.audit, success.audit), 'T1 forced failure retained partial state');
  return { status: 'P', successfulTransfer: true, insufficientFundsRollback: true, forcedFailureAfterDebitRollback: true, finalState: final };
}

export async function evaluateT2(databaseUrl, schema) {
  const clients = await Promise.all([connect(databaseUrl), connect(databaseUrl)]); let claims;
  try { claims = await Promise.all([claim(clients[0], schema, 'worker-a'), claim(clients[1], schema, 'worker-b')]); } finally { await Promise.all(clients.map((client) => client.end())); }
  assert(claims.every((entry) => entry.claimedWorkId), 'T2 concurrent calls did not both claim an item'); assert(new Set(claims.map((entry) => entry.claimedWorkId)).size === 2, 'T2 concurrent calls claimed the same item');
  const setup = new Client({ connectionString: databaseUrl }); await setup.connect(); try { await setup.query(`update ${qi(schema)}.work_items set state = 'queued', claimed_by = null where id = $1`, ['8001']); } finally { await setup.end(); }
  const forced = await connect(databaseUrl); try { await rejects(() => claim(forced, schema, 'worker-rollback', { failAfterClaim: true }), 'T2 forced rollback'); } finally { await forced.end(); }
  const final = await state(databaseUrl, schema), byId = new Map(final.work.map((row) => [row.id, row])); assert(byId.get('8001')?.state === 'queued' && byId.get('8001')?.claimed_by === null, 'T2 rollback retained a claim'); assert(byId.get('8002')?.state === 'claimed' && byId.get('8002')?.claimed_by, 'T2 committed claim state is wrong');
  return { status: 'P', distinctClaimIds: claims.map((entry) => entry.claimedWorkId), rollbackLeavesUnclaimed: true, finalState: final };
}

export async function evaluateW5(databaseUrl, schema) {
  const client = await connect(databaseUrl); try {
    const before = await deepOffsetPage(client, schema, { offset: 20000, limit: 25 }), after = await keysetPage(client, schema, { afterId: 20000, limit: 25 }); assert(same(before.rows, after.rows), 'W5 keyset result differs from deep-offset result'); const beforeRowsVisited = rowsVisited(before.explain), finalRowsVisited = rowsVisited(after.explain); assert(beforeRowsVisited > finalRowsVisited, `W5 final plan did not reduce rows visited (${beforeRowsVisited} <= ${finalRowsVisited})`);
    const regressions = []; for (const page of [{ offset: 0, afterId: 0 }, { offset: 29975, afterId: 29975 }]) { const oldPage = await deepOffsetPage(client, schema, { offset: page.offset, limit: 25 }), newPage = await keysetPage(client, schema, { afterId: page.afterId, limit: 25 }); assert(same(oldPage.rows, newPage.rows), `W5 regression page ${page.offset} differs`); regressions.push({ offset: page.offset, rows: oldPage.rows.length }); }
    return { status: 'P', resultEquivalence: true, regressionCases: regressions, beforeRowsVisited, finalRowsVisited, beforeExplain: before.explain, finalExplain: after.explain, beforeSql: before.sql, finalSql: after.sql };
  } finally { await client.end(); }
}

export async function runReferenceControls({ databaseUrl, workloads = ['T1', 'T2', 'W5'], outputPath = resolve('tmp/competitive-benchmark-v2-followup-reference-replay.json') }) {
  assert(databaseUrl, 'DATABASE_URL is required'); const fixture = await createFixture(databaseUrl), record = { version: 1, status: 'F', schema: fixture.schema, schemaPattern: SCHEMA_RE.source, node: { evaluator: process.version, wrapper: process.env.ASHIBA_BENCHMARK_NODE_VERSION ?? null }, postgres: null, checks: {}, firstFailure: null, cleanup: { attempted: false, status: 'not-run' }, evidenceSource: 'runner-owned reference replay' };
  try { const client = new Client({ connectionString: databaseUrl }); await client.connect(); try { record.postgres = (await client.query(`select current_database() as database, current_setting('server_version_num') as server_version_num`)).rows[0]; } finally { await client.end(); } assert(String(record.postgres.server_version_num).startsWith('18'), `PostgreSQL 18 required, got ${record.postgres.server_version_num}`); const evaluators = { T1: evaluateT1, T2: evaluateT2, W5: evaluateW5 }; for (const workload of workloads) record.checks[workload] = await evaluators[workload](databaseUrl, fixture.schema); record.status = 'P'; } catch (error) { record.firstFailure = { assertion: message(error) }; } finally { record.cleanup = { attempted: true, ...(await dropFixture(fixture)) }; if (record.cleanup.status !== 'pass') { record.status = 'F'; record.firstFailure ??= { assertion: `cleanup: ${record.cleanup.error}` }; } mkdirSync(dirname(outputPath), { recursive: true }); writeFileSync(outputPath, `${JSON.stringify(record, null, 2)}\n`, 'utf8'); }
  return record;
}
