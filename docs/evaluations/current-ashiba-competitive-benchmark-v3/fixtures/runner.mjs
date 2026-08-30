import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { API_OPERATIONS, assertApiShape } from './api-contract.mjs';
import { createFixture, databaseState, dropFixture, quoteSchema, withClient } from './fixture.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const RUNNER_ID = 'current-ashiba-competitive-benchmark-v3-fixture-runner-1';
const SOURCE_EXTENSIONS = new Set(['.cjs', '.js', '.mjs', '.sql', '.ts', '.tsx']);
const FORBIDDEN_SOURCE = [
  { id: 'public-schema', pattern: /\b(?:from|join|update|into|delete\s+from|create\s+schema|alter\s+schema)\s+public\b/i },
  { id: 'runner-ddl', pattern: /\b(?:create|alter|drop)\s+(?:schema|database|table|type|domain)\b/i },
  { id: 'search-path-public', pattern: /\bsearch_path\b[^;]*\bpublic\b/i },
  { id: 'candidate-failure-injection', pattern: /\b(?:auditFailure|failAfterDebit|failAfterClaim|failure_injection)\b/ },
];

function jsonValue(value) {
  return JSON.parse(JSON.stringify(value, (_, item) => typeof item === 'bigint' ? item.toString() : item));
}

function errorValue(error) {
  return {
    name: error?.name ?? 'Error',
    code: typeof error?.code === 'string' ? error.code : undefined,
    message: error instanceof Error ? error.message : String(error),
  };
}

function check(checks, id, condition, detail) {
  checks.push({ id, status: condition ? 'pass' : 'fail', detail });
  return condition;
}

function codeIs(result, code) {
  return !result.ok && result.error?.code === code;
}

async function invoke(application, operation, input, events) {
  const event = { operation, input: jsonValue(input), startedAt: new Date().toISOString() };
  const started = Date.now();
  try {
    const output = await application[operation](input);
    event.status = 'resolved';
    event.output = jsonValue(output);
    event.durationMs = Date.now() - started;
    events.push(event);
    return { ok: true, output };
  } catch (error) {
    event.status = 'rejected';
    event.error = errorValue(error);
    event.durationMs = Date.now() - started;
    events.push(event);
    return { ok: false, error: event.error };
  }
}

async function createCheckedApplication(createApplication, runtime) {
  return assertApiShape(await createApplication(runtime));
}

async function verifyClose(application, checks, events, label) {
  const first = await invoke(application, 'close', {}, events);
  check(checks, `${label}-close`, first.ok && first.output === undefined, 'close resolves with no value');
  const second = await invoke(application, 'close', {}, events);
  check(checks, `${label}-close-idempotent`, second.ok && second.output === undefined, 'close is idempotent');
  const afterClose = await invoke(application, 'list', {}, events);
  check(checks, `${label}-closed-rejection`, codeIs(afterClose, 'APPLICATION_CLOSED'), 'operations reject after close');
}

async function setInjection(databaseUrl, schema, name, enabled) {
  return withClient(databaseUrl, (client) => client.query(
    `UPDATE ${quoteSchema(schema)}.failure_injection SET enabled = $1 WHERE name = $2`,
    [enabled, name],
  ));
}

async function runG1(context) {
  const { databaseUrl, schema, createApplication, checks, events } = context;
  const application = await createCheckedApplication(createApplication, { connectionString: databaseUrl, schema });
  try {
    const all = await invoke(application, 'list', { sort: 'priority', direction: 'desc', offset: 0, limit: 10 }, events);
    check(checks, 'G1-list-order', all.ok && all.output.map((row) => row.id).join(',') === '101,103,102,104', 'priority desc then stable id asc');
    const filtered = await invoke(application, 'list', { status: 'open', assignee: null, sort: 'id', direction: 'asc', offset: 0, limit: 10 }, events);
    check(checks, 'G1-filter-null-assignee', filtered.ok && filtered.output.length === 1 && filtered.output[0].id === '103', 'null assignee filter');
    const invalidSort = await invoke(application, 'list', { sort: 'title', limit: 10, offset: 0 }, events);
    check(checks, 'G1-invalid-sort', codeIs(invalidSort, 'VALIDATION'), 'unreviewed sort rejects');
    const missing = await invoke(application, 'get', { id: '999' }, events);
    check(checks, 'G1-get-null', missing.ok && missing.output === null, 'missing ticket returns null');
    const hostileTitle = "O'Reilly; $1 /* hostile value */";
    const created = await invoke(application, 'create', { title: hostileTitle, status: 'open', assignee: null, priority: 2, metadata: { marker: hostileTitle } }, events);
    const createdRow = created.ok ? await invoke(application, 'get', { id: created.output.id }, events) : { ok: false };
    check(checks, 'G1-hostile-value', createdRow.ok && createdRow.output?.title === hostileTitle && createdRow.output?.metadata?.marker === hostileTitle, 'hostile text remains a value');
    const assigned = await invoke(application, 'assign', { id: '103', assignee: 'carol' }, events);
    check(checks, 'G1-assign', assigned.ok, 'assignment commits');
    const beforeFailure = await databaseState(databaseUrl, schema);
    await setInjection(databaseUrl, schema, 'assign_audit', true);
    const failed = await invoke(application, 'assign', { id: '102', assignee: 'injected-worker' }, events);
    await setInjection(databaseUrl, schema, 'assign_audit', false);
    const afterFailure = await databaseState(databaseUrl, schema);
    check(checks, 'G1-assign-trigger-rollback', !failed.ok && JSON.stringify(afterFailure.tickets) === JSON.stringify(beforeFailure.tickets) && JSON.stringify(afterFailure.ticketAudit) === JSON.stringify(beforeFailure.ticketAudit), 'runner-owned post-audit trigger rolls back assignment');
  } finally {
    await verifyClose(application, checks, events, 'G1');
  }
}

async function runT1(context) {
  const { databaseUrl, schema, createApplication, checks, events } = context;
  const application = await createCheckedApplication(createApplication, { connectionString: databaseUrl, schema });
  try {
    const success = await invoke(application, 'transfer', { fromAccountId: '7001', toAccountId: '7002', amountCents: '1250', note: 'runner control' }, events);
    const afterSuccess = await databaseState(databaseUrl, schema);
    check(checks, 'T1-success', success.ok && afterSuccess.accounts[0].balance_cents === '8750' && afterSuccess.accounts[1].balance_cents === '6250' && afterSuccess.transferAudit.length === 1, 'debit, credit, and audit commit together');
    const beforeInsufficient = JSON.stringify(afterSuccess);
    const insufficient = await invoke(application, 'transfer', { fromAccountId: '7002', toAccountId: '7001', amountCents: '999999', note: 'insufficient' }, events);
    const afterInsufficient = await databaseState(databaseUrl, schema);
    check(checks, 'T1-insufficient-rollback', codeIs(insufficient, 'INSUFFICIENT_FUNDS') && JSON.stringify(afterInsufficient) === beforeInsufficient, 'insufficient funds do not mutate state');
    await setInjection(databaseUrl, schema, 'transfer_audit', true);
    const injected = await invoke(application, 'transfer', { fromAccountId: '7001', toAccountId: '7002', amountCents: '100', note: 'db-trigger failure' }, events);
    await setInjection(databaseUrl, schema, 'transfer_audit', false);
    const afterInjected = await databaseState(databaseUrl, schema);
    check(checks, 'T1-trigger-rollback', !injected.ok && JSON.stringify(afterInjected) === beforeInsufficient, 'runner-owned post-debit trigger rolls back transfer');
  } finally {
    await verifyClose(application, checks, events, 'T1');
  }
}

async function runT2(context) {
  const { databaseUrl, schema, createApplication, checks, events } = context;
  const runtime = { connectionString: databaseUrl, schema };
  const workerA = await createCheckedApplication(createApplication, runtime);
  const workerB = await createCheckedApplication(createApplication, runtime);
  try {
    const [a, b] = await Promise.all([invoke(workerA, 'claim', { workerId: 'worker-a' }, events), invoke(workerB, 'claim', { workerId: 'worker-b' }, events)]);
    const claims = [a.output?.claimedWorkId, b.output?.claimedWorkId];
    const state = await databaseState(databaseUrl, schema);
    check(checks, 'T2-distinct-claims', a.ok && b.ok && claims.every(Boolean) && new Set(claims).size === 2, 'concurrent workers claim distinct queued rows');
    check(checks, 'T2-final-state', state.workItems.filter((row) => claims.includes(row.id)).every((row) => row.state === 'claimed'), 'claims are committed');
    await setInjection(databaseUrl, schema, 'claim_update', true);
    const failed = await invoke(workerA, 'claim', { workerId: 'worker-failure' }, events);
    await setInjection(databaseUrl, schema, 'claim_update', false);
    const afterFailure = await databaseState(databaseUrl, schema);
    check(checks, 'T2-trigger-rollback', !failed.ok && afterFailure.workItems.some((row) => row.id === '8003' && row.state === 'queued' && row.claimed_by === null), 'runner trigger restores failed claim');
  } finally {
    await verifyClose(workerA, checks, events, 'T2-worker-a');
    await verifyClose(workerB, checks, events, 'T2-worker-b');
  }
}

async function runQ1(context) {
  const { databaseUrl, schema, createApplication, checks, events } = context;
  const application = await createCheckedApplication(createApplication, { connectionString: databaseUrl, schema });
  try {
    const input = { requestedTag: 'vip', tier: 'gold' };
    const template = await readFile(join(HERE, 'q1.sql'), 'utf8');
    const oracleSql = template.replaceAll('{{schema}}', quoteSchema(schema));
    const expected = await withClient(databaseUrl, async (client) => (await client.query(oracleSql, [input.requestedTag, input.tier])).rows);
    const actual = await invoke(application, 'investigate', input, events);
    check(checks, 'Q1-result-equivalence', actual.ok && JSON.stringify(jsonValue(actual.output?.rows)) === JSON.stringify(jsonValue(expected)), 'candidate-owned query result matches frozen independent oracle');
    const explained = await invoke(application, 'explain', input, events);
    const evidence = explained.output;
    const safeTrace = typeof evidence?.sourceSql === 'string' && /^\s*(?:WITH|SELECT)\b/i.test(evidence.sourceSql) && !/\bpublic\b/i.test(evidence.sourceSql) && !/;\s*\S/.test(evidence.sourceSql);
    check(checks, 'Q1-candidate-explain', explained.ok && safeTrace && Array.isArray(evidence?.params) && evidence.params.join(',') === 'vip,gold' && evidence.plan != null, 'candidate-owned EXPLAIN evidence returned through frozen entrypoint');
  } finally {
    await verifyClose(application, checks, events, 'Q1');
  }
}

async function walkFiles(root, current = root) {
  const entries = await readdir(current, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const path = join(current, entry.name);
    if (entry.isDirectory()) files.push(...await walkFiles(root, path));
    else if (SOURCE_EXTENSIONS.has(extname(entry.name).toLowerCase())) files.push(path);
  }
  return files;
}

export async function inspectCandidate(candidatePath) {
  const absolute = resolve(candidatePath);
  const info = await stat(absolute);
  const root = info.isDirectory() ? absolute : dirname(absolute);
  const files = await walkFiles(root);
  const manifest = [];
  const findings = [];
  for (const path of files.sort()) {
    const content = await readFile(path, 'utf8');
    const displayPath = relative(root, path).replaceAll('\\', '/');
    manifest.push({ path: displayPath, bytes: Buffer.byteLength(content), sha256: createHash('sha256').update(content).digest('hex') });
    for (const forbidden of FORBIDDEN_SOURCE) if (forbidden.pattern.test(content)) findings.push({ id: forbidden.id, path: displayPath });
  }
  return { root, files: manifest, findings, pass: findings.length === 0 };
}

export async function runNegativeControls() {
  const checks = [];
  check(checks, 'negative-missing-api-rejected', (() => { try { assertApiShape({ list() {} }); return false; } catch { return true; } })(), 'missing public operations are rejected');
  check(checks, 'negative-failure-flag-rejected', FORBIDDEN_SOURCE.find((item) => item.id === 'candidate-failure-injection').pattern.test('const auditFailure = true;'), 'candidate-visible failure flags are statically rejected');
  return checks;
}

export async function runBenchmark({ databaseUrl = process.env.DATABASE_URL, candidatePath, workloads = ['G1', 'T1', 'T2', 'Q1'], outputPath, staticOnly = false } = {}) {
  if (!candidatePath) throw new Error('candidatePath is required');
  const source = await inspectCandidate(candidatePath);
  const record = { harness: RUNNER_ID, candidatePath: resolve(candidatePath), workloads, source, checks: [], events: [], cleanup: { status: 'not-run' }, startedAt: new Date().toISOString() };
  if (staticOnly) {
    record.status = source.pass ? 'P' : 'F';
  } else if (!databaseUrl) {
    record.status = 'F';
    record.runnerError = { name: 'Error', message: 'DATABASE_URL is required for a live run' };
  } else {
    let fixture;
    try {
      fixture = await createFixture(databaseUrl);
      record.schema = fixture.schema;
      if (!source.pass) record.checks.push({ id: 'static-inspection', status: 'fail', detail: source.findings });
      const module = await import(pathToFileURL(resolve(candidatePath)).href);
      if (typeof module.createApplication !== 'function') throw new Error('candidate must export createApplication(runtime)');
      for (const workload of workloads) {
        const context = { databaseUrl, schema: fixture.schema, createApplication: module.createApplication, checks: record.checks, events: record.events };
        if (workload === 'G1') await runG1(context);
        else if (workload === 'T1') await runT1(context);
        else if (workload === 'T2') await runT2(context);
        else if (workload === 'Q1') await runQ1(context);
        else throw new Error(`unknown workload: ${workload}`);
      }
      record.status = record.checks.every((item) => item.status === 'pass') ? 'P' : 'F';
    } catch (error) {
      record.status = 'F';
      record.runnerError = errorValue(error);
    } finally {
      if (fixture) record.cleanup = await dropFixture(fixture);
    }
  }
  record.finishedAt = new Date().toISOString();
  if (outputPath) {
    await mkdir(dirname(resolve(outputPath)), { recursive: true });
    await writeFile(resolve(outputPath), `${JSON.stringify(jsonValue(record), null, 2)}\n`);
  }
  return record;
}

export async function runReferenceControl(options = {}) {
  return runBenchmark({ ...options, candidatePath: join(HERE, 'reference', 'reference-application.mjs') });
}

function argValue(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const args = process.argv.slice(2);
  if (args.includes('--negative-controls')) {
    const checks = await runNegativeControls();
    console.log(JSON.stringify({ status: checks.every((item) => item.status === 'pass') ? 'P' : 'F', checks }, null, 2));
  } else {
    const workloads = (argValue(args, '--workload') ?? 'G1,T1,T2,Q1').split(',').filter(Boolean);
    const options = { candidatePath: argValue(args, '--candidate'), outputPath: argValue(args, '--output'), workloads, staticOnly: args.includes('--static-only') };
    const record = args.includes('--reference-control') ? await runReferenceControl(options) : await runBenchmark(options);
    console.log(JSON.stringify({ status: record.status, checks: record.checks, cleanup: record.cleanup, output: options.outputPath ?? null }, null, 2));
    if (record.status !== 'P') process.exitCode = 1;
  }
}
