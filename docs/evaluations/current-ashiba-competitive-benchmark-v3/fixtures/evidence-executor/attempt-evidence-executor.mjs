#!/usr/bin/env node
/** Durable, non-scoring evidence controller for a coordinator-declared attempt. */
import { createHash, randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const VERSION = 2;
const TRANSIENT = new Set(['node_modules', '.git', 'coverage', '.next', '.turbo', 'dist', 'build']);
const SENSITIVE = new Set(['.env', '.npmrc', '.pgpass']);
const LOCKS = new Set(['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'npm-shrinkwrap.json']);
const FIRST_PASS = new Set(['build', 'typecheck', 'test', 'runner']);

function usage(message) {
  if (message) console.error(`error: ${message}`);
  console.error(`usage:\n  node attempt-evidence-executor.mjs run --candidate-root <dir> --entrypoint <path> --evidence-root <dir> --packet <file> --prompt <file> --command <slot>=<shell command>... [--runner-command <shell command> --runner-json <file>] [--dry-run]\n  node attempt-evidence-executor.mjs finalize --attempt-dir <dir> --treatment-fidelity <pass|fail|not-applicable> [--treatment-note <text>] [--runner-json <file>] [--db-summary <file>]\n  node attempt-evidence-executor.mjs self-test`);
  process.exitCode = 2;
}
function argsOf(argv) {
  const [mode, ...rest] = argv; const args = { mode, commands: [] };
  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index]; if (!token.startsWith('--')) return usage(`unexpected argument: ${token}`);
    const key = token.slice(2);
    if (key === 'dry-run') { args.dryRun = true; continue; }
    if (key === 'command') { if (rest[index + 1] === undefined) return usage('--command requires a value'); args.commands.push(rest[++index]); continue; }
    if (rest[index + 1] === undefined || rest[index + 1].startsWith('--')) return usage(`--${key} requires a value`);
    args[key] = rest[++index];
  } return args;
}
function redact(value) { return String(value).replace(/(postgres(?:ql)?(?:\+[^:]+)?:\/\/[^:/?#]+:)[^@\s]+(@)/gi, '$1[REDACTED]$2').replace(/((?:DATABASE_URL|PGPASSWORD|PASSWORD|TOKEN|SECRET|API_KEY)\s*[=:]\s*)([^\s,;]+)/gi, '$1[REDACTED]').replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi, '$1[REDACTED]'); }
function sha256(value) { return createHash('sha256').update(value).digest('hex'); }
async function hash(file) { return sha256(await fs.readFile(file)); }
async function json(file, value) { await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8'); }
async function redactedJson(file) { const text = redact(await fs.readFile(file, 'utf8')); try { return JSON.parse(text); } catch { return { raw: text, parseError: true }; } }
function display(relative) { return relative.replaceAll(path.sep, '/'); }
function sensitive(relative) { const base = path.basename(relative).toLowerCase(); return SENSITIVE.has(base) || base.startsWith('.env.'); }
async function files(root, relative = '') {
  const result = [];
  for (const entry of (await fs.readdir(path.join(root, relative), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    if (TRANSIENT.has(entry.name)) continue;
    const child = path.join(relative, entry.name);
    if (entry.isDirectory()) result.push(...await files(root, child)); else if (entry.isFile()) result.push(child);
  } return result;
}
async function manifest(root) {
  const entries = [];
  for (const relative of await files(root)) { const absolute = path.join(root, relative); const info = await fs.stat(absolute); entries.push({ path: display(relative), bytes: info.size, sha256: await hash(absolute), lockfile: LOCKS.has(path.basename(relative)), excludedFromSnapshot: sensitive(relative) }); }
  return { root: redact(root), fileCount: entries.length, files: entries };
}
async function snapshot(root, targetRoot) {
  const copied = [], excluded = [];
  for (const relative of await files(root)) {
    const source = path.join(root, relative); const input = await fs.readFile(source);
    if (sensitive(relative)) { excluded.push({ path: display(relative), reason: 'sensitive-name', sha256: sha256(input) }); continue; }
    let output = input, redacted = false;
    if (!input.includes(0)) { const text = input.toString('utf8'); const safe = redact(text); output = Buffer.from(safe, 'utf8'); redacted = safe !== text; }
    const target = path.join(targetRoot, relative); await fs.mkdir(path.dirname(target), { recursive: true }); await fs.writeFile(target, output); await fs.chmod(target, 0o444);
    copied.push({ path: display(relative), sourceSha256: sha256(input), snapshotSha256: sha256(output), redacted });
  } return { root: 'candidate-source-before-cleanup', copied, excluded };
}
function descriptor(value) { const at = value.indexOf('='); if (at <= 0 || at === value.length - 1) throw new Error(`command must be <slot>=<shell command>: ${value}`); const slot = value.slice(0, at).trim(); if (!/^[a-z][a-z0-9-]*$/i.test(slot)) throw new Error(`invalid command slot: ${slot}`); return { slot, command: value.slice(at + 1) }; }
function shell(command, cwd) { return new Promise((resolve) => { const child = spawn(command, { cwd, shell: true, windowsHide: true, env: process.env }); let stdout = '', stderr = ''; child.stdout.on('data', (part) => { stdout += part; }); child.stderr.on('data', (part) => { stderr += part; }); child.on('error', (error) => resolve({ exitCode: null, stdout, stderr: `${stderr}${error.stack ?? error.message}`, spawnError: error.message })); child.on('close', (exitCode, signal) => resolve({ exitCode, signal, stdout, stderr })); }); }
async function log(file, value) { await fs.writeFile(file, redact(value), 'utf8'); await fs.chmod(file, 0o444); }
async function execute(attemptDir, item, cwd, dryRun) {
  const stem = item.slot.replaceAll(/[^a-z0-9-]/gi, '_'); const stdout = path.join(attemptDir, 'logs', `${stem}.stdout.log`); const stderr = path.join(attemptDir, 'logs', `${stem}.stderr.log`);
  if (dryRun) { await log(stdout, 'dry-run: command was not executed\n'); await log(stderr, ''); return { slot: item.slot, command: redact(item.command), status: 'planned', exitCode: null, stdout: `logs/${stem}.stdout.log`, stderr: `logs/${stem}.stderr.log` }; }
  const startedAt = new Date().toISOString(); const result = await shell(item.command, cwd); await log(stdout, result.stdout); await log(stderr, result.stderr);
  return { slot: item.slot, command: redact(item.command), status: result.exitCode === 0 ? 'pass' : 'fail', exitCode: result.exitCode, signal: result.signal ?? null, spawnError: result.spawnError ? redact(result.spawnError) : undefined, startedAt, finishedAt: new Date().toISOString(), stdout: `logs/${stem}.stdout.log`, stderr: `logs/${stem}.stderr.log` };
}
function firstPass(commands) { const slots = Object.fromEntries([...FIRST_PASS].map((slot) => [slot, { status: 'not-declared' }])); for (const item of commands) if (FIRST_PASS.has(item.slot)) slots[item.slot] = { status: item.status, command: item.slot, exitCode: item.exitCode ?? null }; return { status: 'recorded-not-scored', slots, note: 'Command outcomes are not a benchmark score.' }; }
async function create(args) {
  for (const key of ['candidate-root', 'entrypoint', 'evidence-root', 'packet', 'prompt']) if (!args[key]) return usage(`missing --${key}`);
  const candidateRoot = path.resolve(args['candidate-root']); const entrypoint = path.resolve(candidateRoot, args.entrypoint); const evidenceRoot = path.resolve(args['evidence-root']); const packet = path.resolve(args.packet); const prompt = path.resolve(args.prompt);
  await Promise.all([fs.access(candidateRoot), fs.access(entrypoint), fs.access(packet), fs.access(prompt)]);
  const attemptId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomBytes(6).toString('hex')}`; const attemptDir = path.join(evidenceRoot, 'attempts', attemptId); await fs.mkdir(path.join(attemptDir, 'logs'), { recursive: true });
  await json(path.join(attemptDir, 'source-manifest-before.json'), await manifest(candidateRoot));
  await json(path.join(attemptDir, 'candidate-snapshot-before.json'), await snapshot(candidateRoot, path.join(attemptDir, 'candidate-source-before-execution')));
  await json(path.join(attemptDir, 'packet-hashes.json'), { packet: { path: redact(packet), sha256: await hash(packet) }, prompt: { path: redact(prompt), sha256: await hash(prompt) } });
  await json(path.join(attemptDir, 'treatment-review.json'), { status: 'required', value: null, note: 'Finalization rejects an omitted treatment-fidelity value. The controller does not infer fidelity.' });
  await json(path.join(attemptDir, 'runner-result.json'), { status: 'not-attached' }); await json(path.join(attemptDir, 'database-final-state.json'), { status: 'not-attached' });
  await json(path.join(attemptDir, 'attempt.json'), { schemaVersion: VERSION, kind: 'benchmark-attempt-evidence-controller', scoring: 'external', candidateRoot: redact(candidateRoot), entrypoint: redact(entrypoint), attemptId, createdAt: new Date().toISOString(), cleanup: { status: 'pending', recordedBeforeCleanup: false } });
  return { candidateRoot, attemptDir, attemptId };
}
async function run(args) {
  const attempt = await create(args); const commands = args.commands.map(descriptor); if (new Set(commands.map((item) => item.slot)).size !== commands.length) throw new Error('command slots must be unique'); if (args['runner-command']) commands.push({ slot: 'runner', command: args['runner-command'] });
  const results = []; let prerequisites = true;
  for (const item of commands) { if (item.slot === 'runner' && !prerequisites && !args.dryRun) { results.push({ slot: 'runner', command: redact(item.command), status: 'skipped-prerequisite-failed', exitCode: null }); continue; } const result = await execute(attempt.attemptDir, item, attempt.candidateRoot, Boolean(args.dryRun)); results.push(result); if (item.slot !== 'runner' && result.status === 'fail') prerequisites = false; }
  await json(path.join(attempt.attemptDir, 'commands.json'), { status: args.dryRun ? 'dry-run' : 'executed-not-scored', commands: results }); await json(path.join(attempt.attemptDir, 'first-pass.json'), firstPass(results));
  if (args['runner-json']) { const input = path.resolve(args['runner-json']); await json(path.join(attempt.attemptDir, 'runner-result.json'), { status: 'captured', source: redact(input), sourceSha256: await hash(input), value: await redactedJson(input) }); }
  await json(path.join(attempt.attemptDir, 'candidate-snapshot-after.json'), await snapshot(attempt.candidateRoot, path.join(attempt.attemptDir, 'candidate-source-before-cleanup'))); await json(path.join(attempt.attemptDir, 'source-manifest-after.json'), await manifest(attempt.candidateRoot));
  console.log(JSON.stringify({ attemptDir: attempt.attemptDir, attemptId: attempt.attemptId, dryRun: Boolean(args.dryRun), finalized: false }, null, 2));
}
async function evidenceManifest(attemptDir) { const entries = []; for (const relative of await files(attemptDir)) { if (relative === 'evidence-manifest.json') continue; const absolute = path.join(attemptDir, relative); const info = await fs.stat(absolute); entries.push({ path: display(relative), bytes: info.size, sha256: await hash(absolute) }); } return { algorithm: 'sha256', createdAt: new Date().toISOString(), files: entries }; }
async function finalize(args) {
  if (!args['attempt-dir']) return usage('missing --attempt-dir'); if (!['pass', 'fail', 'not-applicable'].includes(args['treatment-fidelity'])) return usage('--treatment-fidelity must be pass, fail, or not-applicable');
  const attemptDir = path.resolve(args['attempt-dir']); await fs.access(path.join(attemptDir, 'attempt.json'));
  for (const [option, target] of [['runner-json', 'runner-result.json'], ['db-summary', 'database-final-state.json']]) if (args[option]) { const input = path.resolve(args[option]); await json(path.join(attemptDir, target), { status: 'captured', source: redact(input), sourceSha256: await hash(input), value: await redactedJson(input) }); }
  await json(path.join(attemptDir, 'treatment-review.json'), { status: 'explicit-final-value', value: args['treatment-fidelity'], note: args['treatment-note'] ? redact(args['treatment-note']) : null, decidedAt: new Date().toISOString(), decidedBy: 'coordinator-required' });
  await json(path.join(attemptDir, 'finalization.json'), { finalizedAt: new Date().toISOString(), cleanup: { status: 'pending-external', recordedBeforeCleanup: true, note: 'Cleanup may occur only after this final manifest is written.' } });
  const final = await evidenceManifest(attemptDir); await json(path.join(attemptDir, 'evidence-manifest.json'), final); await fs.chmod(path.join(attemptDir, 'evidence-manifest.json'), 0o444); await fs.writeFile(path.join(attemptDir, 'FINALIZED'), `${final.createdAt}\n`, 'utf8'); await fs.chmod(path.join(attemptDir, 'FINALIZED'), 0o444);
  console.log(JSON.stringify({ attemptDir, finalized: true, evidenceManifest: 'evidence-manifest.json' }, null, 2));
}
async function selfTest() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ashiba-benchmark-evidence-executor-'));
  try { const candidate = path.join(root, 'candidate'), evidence = path.join(root, 'evidence'); await fs.mkdir(candidate, { recursive: true }); await fs.writeFile(path.join(candidate, 'application.mjs'), 'export const createApplication = () => ({});\n'); await fs.writeFile(path.join(root, 'packet.json'), '{"packet":"self-test"}\n'); await fs.writeFile(path.join(root, 'prompt.txt'), 'self-test prompt\n'); const attempt = await create({ 'candidate-root': candidate, entrypoint: 'application.mjs', 'evidence-root': evidence, packet: path.join(root, 'packet.json'), prompt: path.join(root, 'prompt.txt') }); const item = await execute(attempt.attemptDir, { slot: 'typecheck', command: `${JSON.stringify(process.execPath)} --version` }, candidate, false); await json(path.join(attempt.attemptDir, 'commands.json'), { status: 'self-test-not-scored', commands: [item] }); await json(path.join(attempt.attemptDir, 'first-pass.json'), firstPass([item])); await json(path.join(attempt.attemptDir, 'candidate-snapshot-after.json'), await snapshot(candidate, path.join(attempt.attemptDir, 'candidate-source-before-cleanup'))); await json(path.join(attempt.attemptDir, 'source-manifest-after.json'), await manifest(candidate)); await finalize({ 'attempt-dir': attempt.attemptDir, 'treatment-fidelity': 'not-applicable', 'treatment-note': 'controller self-test; not a benchmark attempt' }); const final = JSON.parse(await fs.readFile(path.join(attempt.attemptDir, 'evidence-manifest.json'), 'utf8')); if (item.status !== 'pass' || !final.files.some((file) => file.path === 'source-manifest-before.json')) throw new Error('self-test assertion failed'); console.log(JSON.stringify({ status: 'pass', scoring: 'none' }, null, 2)); } finally { await fs.rm(root, { recursive: true, force: true }); }
}
try { const args = argsOf(process.argv.slice(2)); if (args.mode === 'run') await run(args); else if (args.mode === 'finalize') await finalize(args); else if (args.mode === 'self-test') await selfTest(); else usage('mode must be run, finalize, or self-test'); } catch (error) { console.error(redact(error?.stack ?? error?.message ?? String(error))); process.exitCode = 1; }
