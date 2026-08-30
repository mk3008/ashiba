#!/usr/bin/env node
/**
 * Capture-only evidence bookkeeping for one benchmark attempt.
 *
 * This utility deliberately does not execute a candidate, score a result, or
 * modify the benchmark runner.  It creates durable, redacted bookkeeping so
 * an external runner can attach its own logs and result files before cleanup.
 */
import { createHash, randomBytes } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const VERSION = 1;
const TRANSIENT = new Set(['node_modules', '.git', 'coverage', '.next', '.turbo']);
const LOCK_NAMES = new Set(['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'npm-shrinkwrap.json']);

function usage(message) {
  if (message) console.error(`error: ${message}`);
  console.error(`usage:
  node attempt-evidence-executor.mjs create --candidate-root <dir> --entrypoint <path> --evidence-root <dir> [--packet <file>] [--prompt <file>] [--command <text>]...
  node attempt-evidence-executor.mjs finalize --attempt-dir <dir> [--runner-json <file>] [--db-summary <file>]`);
  process.exitCode = 2;
}

function parseArgs(argv) {
  const [mode, ...rest] = argv;
  const args = { mode, commands: [] };
  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (!token.startsWith('--')) return usage(`unexpected argument: ${token}`);
    const key = token.slice(2);
    if (key === 'command') {
      if (rest[index + 1] === undefined) return usage('--command requires a value');
      args.commands.push(rest[++index]);
      continue;
    }
    if (rest[index + 1] === undefined || rest[index + 1].startsWith('--')) {
      return usage(`--${key} requires a value`);
    }
    args[key] = rest[++index];
  }
  return args;
}

function redact(value) {
  return String(value)
    .replace(/(postgres(?:ql)?(?:\+[^:]+)?:\/\/[^:/?#]+:)[^@\s]+(@)/gi, '$1[REDACTED]$2')
    .replace(/((?:DATABASE_URL|PGPASSWORD|PASSWORD|TOKEN|SECRET|API_KEY)\s*[=:]\s*)([^\s,;]+)/gi, '$1[REDACTED]')
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi, '$1[REDACTED]');
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

async function hashFile(filePath) {
  return sha256(await fs.readFile(filePath));
}

async function listFiles(root, relative = '') {
  const directory = path.join(root, relative);
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (TRANSIENT.has(entry.name)) continue;
    const childRelative = path.join(relative, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFiles(root, childRelative));
    } else if (entry.isFile()) {
      files.push(childRelative);
    }
  }
  return files;
}

async function sourceManifest(candidateRoot) {
  const files = await listFiles(candidateRoot);
  const rows = [];
  for (const relative of files) {
    const absolute = path.join(candidateRoot, relative);
    const stat = await fs.stat(absolute);
    rows.push({
      path: relative.replaceAll(path.sep, '/'),
      bytes: stat.size,
      sha256: await hashFile(absolute),
      lockfile: LOCK_NAMES.has(path.basename(relative)),
    });
  }
  return { root: candidateRoot, fileCount: rows.length, files: rows };
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function readRedactedJson(filePath) {
  const text = redact(await fs.readFile(filePath, 'utf8'));
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text, parseError: true };
  }
}

async function createAttempt(args) {
  for (const required of ['candidate-root', 'entrypoint', 'evidence-root']) {
    if (!args[required]) return usage(`missing --${required}`);
  }
  const candidateRoot = path.resolve(args['candidate-root']);
  const entrypoint = path.resolve(candidateRoot, args.entrypoint);
  const evidenceRoot = path.resolve(args['evidence-root']);
  await fs.access(candidateRoot);
  await fs.access(entrypoint);
  const attemptId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomBytes(6).toString('hex')}`;
  const attemptDir = path.join(evidenceRoot, 'attempts', attemptId);
  await fs.mkdir(path.join(attemptDir, 'logs'), { recursive: true });

  const packet = args.packet ? path.resolve(args.packet) : null;
  const prompt = args.prompt ? path.resolve(args.prompt) : null;
  const manifest = await sourceManifest(candidateRoot);
  await writeJson(path.join(attemptDir, 'source-manifest.json'), manifest);
  await writeJson(path.join(attemptDir, 'packet-hashes.json'), {
    packet: packet ? { path: redact(packet), sha256: await hashFile(packet) } : null,
    prompt: prompt ? { path: redact(prompt), sha256: await hashFile(prompt) } : null,
  });
  await writeJson(path.join(attemptDir, 'commands.json'), {
    status: 'pending-external-execution',
    commands: args.commands.map((command, index) => ({
      index,
      command: redact(command),
      stdout: `logs/command-${index + 1}.stdout.log`,
      stderr: `logs/command-${index + 1}.stderr.log`,
      exitCode: null,
    })),
  });
  for (let index = 0; index < args.commands.length; index += 1) {
    await fs.writeFile(path.join(attemptDir, 'logs', `command-${index + 1}.stdout.log`), '', 'utf8');
    await fs.writeFile(path.join(attemptDir, 'logs', `command-${index + 1}.stderr.log`), '', 'utf8');
  }
  await writeJson(path.join(attemptDir, 'first-pass.json'), { status: 'pending', note: 'Capture slot; not scored by this utility.' });
  await writeJson(path.join(attemptDir, 'treatment-review.json'), { status: 'pending', note: 'Capture slot; treatment review is external.' });
  await writeJson(path.join(attemptDir, 'runner-result.json'), { status: 'pending', note: 'Attach runner-owned JSON at finalize time.' });
  await writeJson(path.join(attemptDir, 'database-final-state.json'), { status: 'pending', note: 'Attach redacted runner-owned final-state summary at finalize time.' });
  await writeJson(path.join(attemptDir, 'attempt.json'), {
    schemaVersion: VERSION,
    kind: 'benchmark-attempt-evidence-capture',
    scoring: 'external',
    candidateRoot: redact(candidateRoot),
    entrypoint: redact(entrypoint),
    attemptId,
    createdAt: new Date().toISOString(),
    cleanup: { status: 'pending', recordedBeforeCleanup: false },
  });
  console.log(JSON.stringify({ attemptDir, attemptId, sourceFileCount: manifest.fileCount }, null, 2));
}

async function finalizeAttempt(args) {
  if (!args['attempt-dir']) return usage('missing --attempt-dir');
  const attemptDir = path.resolve(args['attempt-dir']);
  await fs.access(path.join(attemptDir, 'attempt.json'));
  const updates = { finalizedAt: new Date().toISOString(), sources: {} };
  for (const [key, target, output] of [['runner-json', 'runner-json', 'runner-result.json'], ['db-summary', 'database-summary', 'database-final-state.json']]) {
    if (!args[key]) continue;
    const input = path.resolve(args[key]);
    const value = await readRedactedJson(input);
    await writeJson(path.join(attemptDir, output), { status: 'captured', source: redact(input), value });
    updates.sources[target] = { path: redact(input), sha256: await hashFile(input) };
  }
  updates.cleanup = { status: 'pending', recordedBeforeCleanup: true, note: 'Cleanup is intentionally external to preserve evidence.' };
  await writeJson(path.join(attemptDir, 'finalization.json'), updates);
  console.log(JSON.stringify({ attemptDir, finalized: true, attached: Object.keys(updates.sources) }, null, 2));
}

const args = parseArgs(process.argv.slice(2));
if (args.mode === 'create') await createAttempt(args);
else if (args.mode === 'finalize') await finalizeAttempt(args);
else usage(`mode must be create or finalize`);
