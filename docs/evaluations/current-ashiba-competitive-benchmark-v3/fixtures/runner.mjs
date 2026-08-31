import { createHash } from 'node:crypto';
import { mkdir, open, readFile, readdir, stat, readlink, realpath, mkdtemp } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { WORKLOAD_OPERATIONS, assertApiShape } from './api-contract.mjs';
import { createFixture, databaseState, dropFixture, quoteSchema, withClient } from './fixture.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const RUNNER_ID = 'current-ashiba-competitive-benchmark-v3-fixture-runner-3';
const TEXT_EXTENSIONS = new Set(['.cjs', '.css', '.cts', '.js', '.json', '.lock', '.md', '.mjs', '.mts', '.sql', '.toml', '.ts', '.tsx', '.txt', '.yaml', '.yml']);
const BINARY_EXTENSIONS = new Set(['.bin', '.dll', '.dylib', '.exe', '.gif', '.gz', '.ico', '.jar', '.jpeg', '.jpg', '.node', '.pdf', '.png', '.tar', '.tgz', '.wasm', '.webp', '.zip']);
const EXCLUDED_DIRECTORIES = new Set(['.git', '.pnpm', 'node_modules']);
const FROZEN_PACKED_ARTIFACT = Object.freeze({
  packageName: '@ashiba-ts/named-parameters',
  path: join(HERE, 'artifacts', 'ashiba-ts-named-parameters-0.1.0.tgz'),
  sha256: '64b95657af62120d5b8662224b298cc610a74280e515b33ee485e41247bdcc4d',
});
const FORBIDDEN_SOURCE = [
  { id: 'public-schema', pattern: /\b(?:from|join|update|into|delete\s+from|create\s+schema|alter\s+schema)\s+public\b/i },
  { id: 'runner-ddl', pattern: /\b(?:create|alter|drop)\s+(?:schema|database|table|type|domain)\b/i },
  { id: 'search-path-public', pattern: /\bsearch_path\b[^;]*\bpublic\b/i },
  { id: 'candidate-failure-injection', pattern: /\b(?:auditFailure|failAfterDebit|failAfterClaim|failure_injection)\b/ },
  { id: 'candidate-admin-database-url', pattern: /\bprocess\s*(?:\.\s*env|\[\s*['"]env['"]\s*\])\s*(?:\.\s*DATABASE_URL|\[\s*['"]DATABASE_URL['"]\s*\])/ },
];

function jsonValue(value) {
  if (value === undefined) return undefined;
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

async function createCheckedApplication(createApplication, runtime, workload) {
  return assertApiShape(await createApplication(runtime), WORKLOAD_OPERATIONS[workload]);
}

async function verifyClose(application, checks, events, label, workload) {
  const first = await invoke(application, 'close', {}, events);
  check(checks, `${label}-close`, first.ok && first.output === undefined, 'close resolves with no value');
  const second = await invoke(application, 'close', {}, events);
  check(checks, `${label}-close-idempotent`, second.ok && second.output === undefined, 'close is idempotent');
  const probe = WORKLOAD_OPERATIONS[workload].find((operation) => operation !== 'close');
  const afterClose = await invoke(application, probe, {}, events);
  check(checks, `${label}-closed-rejection`, codeIs(afterClose, 'APPLICATION_CLOSED'), `${probe} rejects after close`);
}

async function setInjection(databaseUrl, schema, name, enabled) {
  return withClient(databaseUrl, (client) => client.query(
    `UPDATE ${quoteSchema(schema)}.failure_injection SET enabled = $1 WHERE name = $2`,
    [enabled, name],
  ));
}

async function runG1(context) {
  const { adminDatabaseUrl, candidateDatabaseUrl, schema, createApplication, checks, events } = context;
  const application = await createCheckedApplication(createApplication, { connectionString: candidateDatabaseUrl, schema }, 'G1');
  try {
    const all = await invoke(application, 'list', { sort: 'priority', direction: 'desc', offset: 0, limit: 10 }, events);
    check(checks, 'G1-list-order', all.ok && all.output.map((row) => row.id).join(',') === '101,103,102,104', 'priority desc then stable id asc');
    const expectedOrders = {
      'id:asc': '101,102,103,104',
      'id:desc': '104,103,102,101',
      'priority:asc': '104,102,101,103',
      'priority:desc': '101,103,102,104',
      'createdAt:asc': '101,102,103,104',
      'createdAt:desc': '104,103,102,101',
    };
    for (const [mode, expected] of Object.entries(expectedOrders)) {
      const [sort, direction] = mode.split(':');
      const ordered = await invoke(application, 'list', { sort, direction, offset: 0, limit: 10 }, events);
      check(checks, `G1-sort-${sort}-${direction}`, ordered.ok && ordered.output.map((row) => row.id).join(',') === expected, `${sort} ${direction} uses the required stable ordering`);
    }
    const paged = await invoke(application, 'list', { sort: 'id', direction: 'asc', offset: 1, limit: 2 }, events);
    check(checks, 'G1-pagination-offset-limit', paged.ok && paged.output.map((row) => row.id).join(',') === '102,103', 'offset and limit apply after the stable ordering');
    const filtered = await invoke(application, 'list', { status: 'open', assignee: null, sort: 'id', direction: 'asc', offset: 0, limit: 10 }, events);
    check(checks, 'G1-filter-null-assignee', filtered.ok && filtered.output.length === 1 && filtered.output[0].id === '103', 'null assignee filter');
    const invalidSort = await invoke(application, 'list', { sort: 'title', limit: 10, offset: 0 }, events);
    check(checks, 'G1-invalid-sort', codeIs(invalidSort, 'VALIDATION'), 'unreviewed sort rejects');
    const invalidPagination = await invoke(application, 'list', { sort: 'id', offset: 0, limit: 0 }, events);
    check(checks, 'G1-invalid-pagination', codeIs(invalidPagination, 'VALIDATION'), 'invalid pagination rejects');
    const malformedGet = await invoke(application, 'get', {}, events);
    check(checks, 'G1-missing-get-id', codeIs(malformedGet, 'VALIDATION'), 'missing get identifier rejects');
    const found = await invoke(application, 'get', { id: '101' }, events);
    check(checks, 'G1-get', found.ok && found.output?.id === '101' && found.output?.title === 'Cannot sign in', 'existing ticket is returned');
    const missing = await invoke(application, 'get', { id: '999' }, events);
    check(checks, 'G1-get-null', missing.ok && missing.output === null, 'missing ticket returns null');
    const hostileTitle = "O'Reilly; $1 /* hostile value */";
    const created = await invoke(application, 'create', { title: hostileTitle, status: 'open', assignee: null, priority: 2, metadata: { marker: hostileTitle } }, events);
    const createdRow = created.ok ? await invoke(application, 'get', { id: created.output.id }, events) : { ok: false };
    check(checks, 'G1-hostile-value', createdRow.ok && createdRow.output?.title === hostileTitle && createdRow.output?.metadata?.marker === hostileTitle, 'hostile text remains a value');
    const assigned = await invoke(application, 'assign', { id: '103', assignee: 'carol' }, events);
    check(checks, 'G1-assign', assigned.ok, 'assignment commits');
    const beforeFailure = await databaseState(adminDatabaseUrl, schema);
    await setInjection(adminDatabaseUrl, schema, 'assign_audit', true);
    const failed = await invoke(application, 'assign', { id: '102', assignee: 'injected-worker' }, events);
    await setInjection(adminDatabaseUrl, schema, 'assign_audit', false);
    const afterFailure = await databaseState(adminDatabaseUrl, schema);
    check(checks, 'G1-assign-trigger-rollback', !failed.ok && JSON.stringify(afterFailure.tickets) === JSON.stringify(beforeFailure.tickets) && JSON.stringify(afterFailure.ticketAudit) === JSON.stringify(beforeFailure.ticketAudit), 'runner-owned post-audit trigger rolls back assignment');
  } finally {
    await verifyClose(application, checks, events, 'G1', 'G1');
  }
}

async function runT1(context) {
  const { adminDatabaseUrl, candidateDatabaseUrl, schema, createApplication, checks, events } = context;
  const application = await createCheckedApplication(createApplication, { connectionString: candidateDatabaseUrl, schema }, 'T1');
  try {
    const success = await invoke(application, 'transfer', { fromAccountId: '7001', toAccountId: '7002', amountCents: '1250', note: 'runner control' }, events);
    const afterSuccess = await databaseState(adminDatabaseUrl, schema);
    check(checks, 'T1-success', success.ok && afterSuccess.accounts[0].balance_cents === '8750' && afterSuccess.accounts[1].balance_cents === '6250' && afterSuccess.transferAudit.length === 1, 'debit, credit, and audit commit together');
    const beforeInsufficient = JSON.stringify(afterSuccess);
    const insufficient = await invoke(application, 'transfer', { fromAccountId: '7002', toAccountId: '7001', amountCents: '999999', note: 'insufficient' }, events);
    const afterInsufficient = await databaseState(adminDatabaseUrl, schema);
    check(checks, 'T1-insufficient-rollback', codeIs(insufficient, 'INSUFFICIENT_FUNDS') && JSON.stringify(afterInsufficient) === beforeInsufficient, 'insufficient funds do not mutate state');
    await setInjection(adminDatabaseUrl, schema, 'transfer_audit', true);
    const injected = await invoke(application, 'transfer', { fromAccountId: '7001', toAccountId: '7002', amountCents: '100', note: 'db-trigger failure' }, events);
    await setInjection(adminDatabaseUrl, schema, 'transfer_audit', false);
    const afterInjected = await databaseState(adminDatabaseUrl, schema);
    check(checks, 'T1-trigger-rollback', !injected.ok && JSON.stringify(afterInjected) === beforeInsufficient, 'runner-owned post-debit trigger rolls back transfer');
  } finally {
    await verifyClose(application, checks, events, 'T1', 'T1');
  }
}

function createStartBarrier(participants) {
  let arrived = 0;
  let release;
  const ready = new Promise((resolveReady) => { release = resolveReady; });
  return {
    async wait() {
      arrived += 1;
      if (arrived === participants) release();
      await ready;
    },
  };
}

async function invokeAtBarrier(application, operation, input, events, barrier) {
  await barrier.wait();
  return invoke(application, operation, input, events);
}

async function runT2(context) {
  const { adminDatabaseUrl, candidateDatabaseUrl, schema, createApplication, checks, events } = context;
  const runtime = { connectionString: candidateDatabaseUrl, schema };
  const workerA = await createCheckedApplication(createApplication, runtime, 'T2');
  const workerB = await createCheckedApplication(createApplication, runtime, 'T2');
  try {
    const barrier = createStartBarrier(2);
    const [a, b] = await Promise.all([
      invokeAtBarrier(workerA, 'claim', { workerId: 'worker-a' }, events, barrier),
      invokeAtBarrier(workerB, 'claim', { workerId: 'worker-b' }, events, barrier),
    ]);
    const claims = [a.output?.claimedWorkId, b.output?.claimedWorkId];
    const state = await databaseState(adminDatabaseUrl, schema);
    check(checks, 'T2-distinct-claims', a.ok && b.ok && claims.every(Boolean) && new Set(claims).size === 2, 'concurrent workers claim distinct queued rows');
    check(checks, 'T2-final-state', state.workItems.filter((row) => claims.includes(row.id)).every((row) => row.state === 'claimed'), 'claims are committed');
    await setInjection(adminDatabaseUrl, schema, 'claim_update', true);
    const failed = await invoke(workerA, 'claim', { workerId: 'worker-failure' }, events);
    await setInjection(adminDatabaseUrl, schema, 'claim_update', false);
    const afterFailure = await databaseState(adminDatabaseUrl, schema);
    check(checks, 'T2-trigger-rollback', !failed.ok && afterFailure.workItems.some((row) => row.id === '8003' && row.state === 'queued' && row.claimed_by === null), 'runner trigger restores failed claim');
  } finally {
    await verifyClose(workerA, checks, events, 'T2-worker-a', 'T2');
    await verifyClose(workerB, checks, events, 'T2-worker-b', 'T2');
  }
}

async function runQ1(context) {
  const { adminDatabaseUrl, candidateDatabaseUrl, schema, createApplication, checks, events } = context;
  const application = await createCheckedApplication(createApplication, { connectionString: candidateDatabaseUrl, schema }, 'Q1');
  try {
    const input = { requestedTag: 'vip', tier: 'gold' };
    const template = await readFile(join(HERE, 'q1.sql'), 'utf8');
    const oracleSql = template.replaceAll('{{schema}}', quoteSchema(schema));
    const expected = await withClient(adminDatabaseUrl, async (client) => (await client.query(oracleSql, [input.requestedTag, input.tier])).rows);
    const actual = await invoke(application, 'investigate', input, events);
    check(checks, 'Q1-result-equivalence', actual.ok && JSON.stringify(jsonValue(actual.output?.rows)) === JSON.stringify(jsonValue(expected)), 'candidate-owned query result matches frozen independent oracle');
    const normalizeSql = (sql) => typeof sql === 'string' ? sql.trim().replace(/\s+/g, ' ') : null;
    const expectedSql = normalizeSql(actual.output?.sourceSql);
    check(checks, 'Q1-executed-sql-matches-source', actual.ok && expectedSql !== null && expectedSql === normalizeSql(actual.output?.executedSql), 'candidate reports the same SQL as source and execution text');
    const explained = await invoke(application, 'explain', input, events);
    const evidence = explained.output;
    const sourceSql = normalizeSql(evidence?.sourceSql);
    const executedSql = normalizeSql(evidence?.executedSql);
    const safeTrace = sourceSql !== null && /^\s*(?:WITH|SELECT)\b/i.test(sourceSql) && !/\bpublic\b/i.test(sourceSql) && !/;\s*\S/.test(sourceSql);
    const planRoot = Array.isArray(evidence?.plan) && evidence.plan.length === 1 ? evidence.plan[0]?.Plan : null;
    const crediblePlan = planRoot !== null && typeof planRoot === 'object' && typeof planRoot['Node Type'] === 'string' && typeof planRoot['Plan Rows'] === 'number';
    check(checks, 'Q1-candidate-explain', explained.ok && safeTrace && sourceSql === executedSql && sourceSql === expectedSql && Array.isArray(evidence?.params) && evidence.params.join(',') === 'vip,gold' && crediblePlan, 'candidate-owned EXPLAIN evidence has matching SQL and a credible PostgreSQL FORMAT JSON plan');
  } finally {
    await verifyClose(application, checks, events, 'Q1', 'Q1');
  }
}

async function walkFiles(root, current = root) {
  const entries = await readdir(current, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (EXCLUDED_DIRECTORIES.has(entry.name)) continue;
    const path = join(current, entry.name);
    if (entry.isSymbolicLink()) {
      files.push({ path, kind: 'symlink', target: await readlink(path) });
    } else if (entry.isDirectory()) {
      files.push(...await walkFiles(root, path));
    } else if (entry.isFile() && !BINARY_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
      files.push({ path, kind: 'file' });
    }
  }
  return files;
}

function dependencyLeakage(value) {
  return typeof value === 'string' && /^(?:file:|link:|workspace:|\.{1,2}[\\/]|[A-Za-z]:[\\/])/i.test(value);
}

async function isFrozenPackedArtifact(reference, manifestPath) {
  if (typeof reference !== 'string' || !reference.startsWith('file:')) return false;
  const target = reference.slice('file:'.length);
  if (!target || /^\/\//.test(target)) return false;
  try {
    const resolvedTarget = await realpath(resolve(dirname(manifestPath), target));
    const contents = await readFile(resolvedTarget);
    return createHash('sha256').update(contents).digest('hex') === FROZEN_PACKED_ARTIFACT.sha256;
  } catch {
    return false;
  }
}

async function addManifestDependencyFindings(content, displayPath, manifestPath, findings) {
  let parsed;
  try { parsed = JSON.parse(content); } catch { return; }
  for (const section of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
    for (const [name, value] of Object.entries(parsed?.[section] ?? {})) {
      if (!dependencyLeakage(value)) continue;
      const permittedArtifact = name === FROZEN_PACKED_ARTIFACT.packageName && await isFrozenPackedArtifact(value, manifestPath);
      if (!permittedArtifact) findings.push({ id: 'workspace-file-link-dependency', path: displayPath, detail: `${section}.${name}=${value}` });
    }
  }
}

async function addLockDependencyFindings(content, displayPath, lockPath, findings) {
  const references = content.match(/(?:file:|link:|workspace:)[^\s",]+/gi) ?? [];
  for (const reference of new Set(references)) {
    if (reference.startsWith('file:') && await isFrozenPackedArtifact(reference, lockPath)) continue;
    findings.push({ id: 'workspace-file-link-lock', path: displayPath, detail: reference });
  }
}

export async function inspectCandidate(candidatePath) {
  const absolute = resolve(candidatePath);
  const info = await stat(absolute);
  const root = info.isDirectory() ? absolute : dirname(absolute);
  const files = await walkFiles(root);
  const manifest = [];
  const findings = [];
  for (const entry of files.sort((left, right) => left.path.localeCompare(right.path))) {
    const displayPath = relative(root, entry.path).replaceAll('\\', '/');
    if (entry.kind === 'symlink') {
      manifest.push({ path: displayPath, kind: 'symlink', target: entry.target });
      findings.push({ id: 'candidate-symlink', path: displayPath, detail: entry.target });
      continue;
    }
    const content = await readFile(entry.path, 'utf8');
    const extension = extname(entry.path).toLowerCase();
    manifest.push({ path: displayPath, kind: 'file', bytes: Buffer.byteLength(content), sha256: createHash('sha256').update(content).digest('hex') });
    if (TEXT_EXTENSIONS.has(extension) || ['package.json', 'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'npm-shrinkwrap.json'].includes(displayPath.split('/').at(-1))) {
      for (const forbidden of FORBIDDEN_SOURCE) if (forbidden.pattern.test(content)) findings.push({ id: forbidden.id, path: displayPath });
    }
    if (displayPath.endsWith('package.json')) await addManifestDependencyFindings(content, displayPath, entry.path, findings);
    if (['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'npm-shrinkwrap.json'].includes(displayPath.split('/').at(-1))) await addLockDependencyFindings(content, displayPath, entry.path, findings);
  }
  return { root, files: manifest, findings, pass: findings.length === 0 };
}

async function isPackageRoot(path) {
  try {
    return (await stat(join(path, 'package.json'))).isFile();
  } catch {
    return false;
  }
}

async function resolveCandidateRoot(candidatePath, requestedRoot, rootIsComplete = false) {
  const explicitRoot = requestedRoot ? resolve(requestedRoot) : null;
  if (rootIsComplete && explicitRoot) return explicitRoot;
  if (explicitRoot && await isPackageRoot(explicitRoot)) return explicitRoot;
  let current = dirname(resolve(candidatePath));
  while (true) {
    if (await isPackageRoot(current)) return current;
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return explicitRoot ?? dirname(resolve(candidatePath));
}

async function writeJsonDurably(path, value) {
  const absolute = resolve(path);
  await mkdir(dirname(absolute), { recursive: true });
  const handle = await open(absolute, 'w');
  try {
    await handle.writeFile(`${JSON.stringify(jsonValue(value), null, 2)}\n`);
    await handle.sync();
  } finally {
    await handle.close();
  }
  return absolute;
}

async function preCleanupPath(outputPath) {
  if (outputPath) return `${resolve(outputPath)}.pre-cleanup.json`;
  const directory = await mkdtemp(join(tmpdir(), 'ashiba-v3-runner-'));
  return join(directory, 'pre-cleanup.json');
}

async function writePreCleanupRecord(record, outputPath) {
  const path = await preCleanupPath(outputPath);
  const writtenAt = new Date().toISOString();
  const preCleanupRecord = {
    ...record,
    cleanup: { status: 'pending', recordedBeforeCleanup: true },
    preCleanupRecord: { status: 'written', path, writtenAt },
  };
  await writeJsonDurably(path, preCleanupRecord);
  record.preCleanupRecord = { status: 'written', path, writtenAt };
}

async function withoutAdminDatabaseUrl(action) {
  const hadDatabaseUrl = Object.hasOwn(process.env, 'DATABASE_URL');
  const databaseUrl = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  try {
    return await action();
  } finally {
    if (hadDatabaseUrl) process.env.DATABASE_URL = databaseUrl;
    else delete process.env.DATABASE_URL;
  }
}

const NEGATIVE_CONTROL_CASES = Object.freeze([
  { id: 'wrong-schema', workload: 'G1' },
  { id: 'wrong-output', workload: 'G1' },
  { id: 'hostile-value', workload: 'G1' },
  { id: 'invalid-sort', workload: 'G1' },
  { id: 'partial-transaction', workload: 'T1' },
  { id: 'duplicate-claim', workload: 'T2' },
  { id: 'fabricated-stdout-missing-api', workload: 'G1' },
  { id: 'admin-database-url-exfiltration', workload: 'G1' },
]);

const STATIC_NEGATIVE_CONTROL_CASES = Object.freeze([
  { id: 'admin-database-url-exfiltration', workload: 'G1' },
]);

export async function runNegativeControls({ databaseUrl = process.env.DATABASE_URL, staticOnly = false } = {}) {
  const checks = [];
  check(checks, 'negative-missing-api-rejected', (() => { try { assertApiShape({ list() {} }); return false; } catch { return true; } })(), 'missing public operations are rejected');
  check(checks, 'negative-failure-flag-rejected', FORBIDDEN_SOURCE.find((item) => item.id === 'candidate-failure-injection').pattern.test('const auditFailure = true;'), 'candidate-visible failure flags are statically rejected');
  if (staticOnly) {
    for (const control of STATIC_NEGATIVE_CONTROL_CASES) {
      const sourceRoot = join(HERE, 'negative-controls', control.id);
      const result = await runBenchmark({
        candidatePath: join(sourceRoot, 'candidate.mjs'),
        sourceRoot,
        workloads: [control.workload],
        staticOnly: true,
      });
      check(checks, `negative-${control.id}-statically-rejected`, result.status === 'F', `static inspection rejects ${control.id}: ${result.status}`);
    }
    return checks;
  }
  if (!databaseUrl) {
    check(checks, 'negative-controls-live-database', false, 'DATABASE_URL is required for live negative controls');
    return checks;
  }
  for (const control of NEGATIVE_CONTROL_CASES) {
    const sourceRoot = join(HERE, 'negative-controls', control.id);
    const result = await runBenchmark({
      databaseUrl,
      candidatePath: join(sourceRoot, 'candidate.mjs'),
      sourceRoot,
      workloads: [control.workload],
    });
    check(checks, `negative-${control.id}-rejected`, result.status === 'F', `runner rejects ${control.id}: ${result.status}`);
  }
  return checks;
}

export async function runBenchmark({ databaseUrl = process.env.DATABASE_URL, candidatePath, sourceRoot, completeCandidateRoot = false, workloads = ['G1', 'T1', 'T2', 'Q1'], outputPath, staticOnly = false } = {}) {
  if (!candidatePath) throw new Error('candidatePath is required');
  const resolvedCandidatePath = resolve(candidatePath);
  const resolvedSourceRoot = await resolveCandidateRoot(resolvedCandidatePath, sourceRoot, completeCandidateRoot);
  const source = await inspectCandidate(resolvedSourceRoot);
  const record = { harness: RUNNER_ID, candidatePath: resolvedCandidatePath, candidateRoot: resolvedSourceRoot, workloads, source, checks: [], events: [], cleanup: { status: 'not-run' }, startedAt: new Date().toISOString() };
  if (staticOnly) {
    record.status = source.pass ? 'P' : 'F';
  } else if (!databaseUrl) {
    record.status = 'F';
    record.runnerError = { name: 'Error', message: 'DATABASE_URL is required for a live run' };
  } else {
    let fixture;
    try {
      if (!source.pass) {
        record.checks.push({ id: 'static-inspection', status: 'fail', detail: source.findings });
        record.status = 'F';
      } else {
        fixture = await createFixture(databaseUrl);
        record.schema = fixture.schema;
        record.candidateRole = fixture.role;
        await withoutAdminDatabaseUrl(async () => {
        const module = await import(pathToFileURL(resolve(candidatePath)).href);
        if (typeof module.createApplication !== 'function') throw new Error('candidate must export createApplication(runtime)');
        for (const workload of workloads) {
          const context = {
            adminDatabaseUrl: databaseUrl,
            candidateDatabaseUrl: fixture.candidateDatabaseUrl,
            schema: fixture.schema,
            createApplication: module.createApplication,
            checks: record.checks,
            events: record.events,
          };
          if (workload === 'G1') await runG1(context);
          else if (workload === 'T1') await runT1(context);
          else if (workload === 'T2') await runT2(context);
          else if (workload === 'Q1') await runQ1(context);
          else throw new Error(`unknown workload: ${workload}`);
        }
        });
        // Preserve runner-owned final database state before cleanup. This is
        // evidence, not a candidate assertion, and lets later review distinguish
        // a behavioral failure from a cleanup incident.
        record.finalDatabaseState = await databaseState(databaseUrl, fixture.schema);
        record.status = record.checks.every((item) => item.status === 'pass') ? 'P' : 'F';
      }
    } catch (error) {
      record.status = 'F';
      record.runnerError = errorValue(error);
    } finally {
      if (fixture) {
        if (!Object.hasOwn(record, 'finalDatabaseState')) {
          try {
            record.finalDatabaseState = await databaseState(databaseUrl, fixture.schema);
          } catch (error) {
            record.status = 'F';
            record.finalDatabaseState = { status: 'unavailable', error: errorValue(error) };
            record.runnerError ??= errorValue(error);
          }
        }
        try {
          await writePreCleanupRecord(record, outputPath);
        } catch (error) {
          record.status = 'F';
          record.preCleanupRecord = { status: 'fail', error: errorValue(error) };
          record.cleanup = { status: 'not-run', reason: 'pre-cleanup-record-write-failed' };
          record.runnerError ??= errorValue(error);
        }
        if (record.preCleanupRecord?.status === 'written') {
          record.cleanup = await dropFixture(fixture);
          if (record.cleanup.status !== 'pass') {
            record.status = 'F';
            record.runnerError ??= { name: 'CleanupError', message: 'fixture cleanup did not complete' };
          }
        }
      }
    }
  }
  record.finishedAt = new Date().toISOString();
  if (outputPath) {
    await writeJsonDurably(outputPath, record);
  }
  return record;
}

export async function runReferenceControl(options = {}) {
  return runBenchmark({ ...options, candidatePath: join(HERE, 'reference', 'reference-application.mjs'), sourceRoot: join(HERE, 'reference'), completeCandidateRoot: true });
}

function argValue(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const args = process.argv.slice(2);
  if (args.includes('--negative-controls')) {
    const checks = await runNegativeControls({ staticOnly: args.includes('--static-only') });
    const status = checks.every((item) => item.status === 'pass') ? 'P' : 'F';
    const record = { harness: RUNNER_ID, kind: 'negative-controls', status, checks, finishedAt: new Date().toISOString() };
    const outputPath = argValue(args, '--output');
    if (outputPath) {
      await writeJsonDurably(outputPath, record);
    }
    console.log(JSON.stringify({ ...record, output: outputPath ?? null }, null, 2));
    if (status !== 'P') process.exitCode = 1;
  } else {
    const workloads = (argValue(args, '--workload') ?? 'G1,T1,T2,Q1').split(',').filter(Boolean);
    const options = { candidatePath: argValue(args, '--candidate'), sourceRoot: argValue(args, '--source-root'), outputPath: argValue(args, '--output'), workloads, staticOnly: args.includes('--static-only') };
    const record = args.includes('--reference-control') ? await runReferenceControl(options) : await runBenchmark(options);
    console.log(JSON.stringify({ status: record.status, checks: record.checks, cleanup: record.cleanup, output: options.outputPath ?? null }, null, 2));
    if (record.status !== 'P') process.exitCode = 1;
  }
}
