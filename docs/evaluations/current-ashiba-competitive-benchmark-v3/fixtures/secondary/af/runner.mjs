import { createHash } from 'node:crypto';
import { mkdir, open, readFile, readdir, realpath, stat } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { runBenchmark } from '../../runner.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PRIMARY_FIXTURES = resolve(HERE, '..', '..');
const CONTROL = new Set(['AF-V', 'AF-L']);
const ARM = new Set(['A', 'P', 'S', 'D', 'K', 'G']);
const IGNORE = new Set(['node_modules', 'dist', 'coverage', '.git']);

function sha(value) {
  return createHash('sha256').update(value).digest('hex');
}

function json(value) {
  return JSON.stringify(value, null, 2);
}

async function writeJson(path, value) {
  const absolute = resolve(path);
  await mkdir(dirname(absolute), { recursive: true });
  const handle = await open(absolute, 'w');
  try {
    await handle.writeFile(`${json(value)}\n`);
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function walk(root, current = root, entries = []) {
  for (const entry of await readdir(current, { withFileTypes: true })) {
    if (IGNORE.has(entry.name)) continue;
    const path = join(current, entry.name);
    if (entry.isDirectory()) await walk(root, path, entries);
    else if (entry.isFile()) {
      const buffer = await readFile(path);
      entries.push({ path: relative(root, path).replaceAll('\\', '/'), bytes: buffer.byteLength, sha256: sha(buffer) });
    } else if (entry.isSymbolicLink()) {
      entries.push({ path: relative(root, path).replaceAll('\\', '/'), kind: 'symlink' });
    }
  }
  return entries.sort((left, right) => left.path.localeCompare(right.path));
}

function architectureFor(control) {
  return control === 'AF-V' ? 'vsa' : 'layered';
}

function requiredGuarantees(arm) {
  return {
    A: ['named-parameter compiler/binder validates missing and unused values'],
    P: ['Prisma 8 RC schema/client contract and runtime query API'],
    S: ['sqlc-generated TypeScript query/type contract'],
    D: ['Drizzle typed schema/query API'],
    K: ['Kysely typed query-builder API'],
    G: ['native pg parameterization and application-owned invariants'],
  }[arm];
}

function isConfig(path) {
  const name = path.split('/').at(-1)?.toLowerCase() ?? '';
  return /(^|[.-])(config|schema|prisma|drizzle|sqlc)([.-]|$)/.test(name) || name === 'tsconfig.json';
}

function newGlobal(path, architecture) {
  if (!path.startsWith('src/')) return isConfig(path);
  const localRoots = architecture === 'vsa'
    ? ['src/tickets/']
    : ['src/presentation/', 'src/application/', 'src/data-access/'];
  if (localRoots.some((root) => path.startsWith(root))) return false;
  return /^(src\/(platform|config|generated|schema|db|lib|shared|repositories|models)\/)/.test(path);
}

function seamChanged(files, baseline, paths) {
  const candidate = new Map(files.map((entry) => [entry.path, entry.sha256]));
  const trusted = new Map(baseline.files.map((entry) => [entry.path, entry.sha256]));
  return paths.some((path) => candidate.get(path) !== trusted.get(path));
}

async function loadBaseline(architecture) {
  const root = join(HERE, 'baselines', architecture);
  const manifestPath = join(root, 'BASELINE_MANIFEST.json');
  const manifestText = await readFile(manifestPath, 'utf8');
  const manifest = JSON.parse(manifestText);
  const actual = await walk(root);
  const actualFiles = actual.filter((entry) => entry.path !== 'BASELINE_MANIFEST.json');
  const manifestFiles = [...manifest.files].sort((left, right) => left.path.localeCompare(right.path));
  const integrity = json(actualFiles) === json(manifestFiles);
  return { root, manifest, manifestHash: sha(manifestText), integrity };
}

function architectureDelta({ control, arm, baseline, candidate }) {
  const architecture = architectureFor(control);
  const candidateByPath = new Map(candidate.map((entry) => [entry.path, entry]));
  const candidateByHash = new Map();
  for (const entry of candidate) {
    if (entry.sha256) (candidateByHash.get(entry.sha256) ?? candidateByHash.set(entry.sha256, []).get(entry.sha256)).push(entry.path);
  }
  const basePaths = new Set(baseline.manifest.files.map((entry) => entry.path));
  const changed = [];
  const missing = [];
  const moved = [];
  for (const entry of baseline.manifest.files) {
    const actual = candidateByPath.get(entry.path);
    if (actual?.sha256 === entry.sha256) continue;
    if (!actual) missing.push(entry.path);
    else changed.push(entry.path);
    for (const destination of candidateByHash.get(entry.sha256) ?? []) if (destination !== entry.path) moved.push({ from: entry.path, to: destination });
  }
  const newFiles = candidate.filter((entry) => !basePaths.has(entry.path)).map((entry) => entry.path);
  const sql = candidate.filter((entry) => entry.path.endsWith('.sql')).map((entry) => entry.path);
  const localSqlRoots = architecture === 'vsa' ? ['src/tickets/'] : ['src/data-access/'];
  const featureLocalSql = sql.length === 0
    ? 'not-applicable'
    : sql.every((path) => localSqlRoots.some((root) => path.startsWith(root))) ? 'yes' : 'no';
  return {
    baselineHash: baseline.manifestHash,
    candidateHash: sha(json(candidate)),
    changedExistingFiles: changed,
    missingExistingFiles: missing,
    movedOrRenamedExistingFiles: moved,
    newFiles,
    newGlobalFiles: newFiles.filter((path) => newGlobal(path, architecture)),
    newConfigFiles: newFiles.filter(isConfig),
    newGeneratedDirectories: [...new Set(newFiles.filter((path) => /(^|\/)(generated|prisma|drizzle|sqlc)(\/|$)/i.test(path)).map((path) => path.split('/').slice(0, -1).join('/')))].filter(Boolean),
    changedPoolSeam: seamChanged(candidate, baseline.manifest, ['src/platform/pool.ts']),
    changedTransactionSeam: seamChanged(candidate, baseline.manifest, ['src/platform/transaction.ts']),
    changedDtoSeam: seamChanged(candidate, baseline.manifest, architecture === 'vsa' ? ['src/tickets/dto.ts'] : ['src/contracts/ticket-dto.ts']),
    changedTestSeam: seamChanged(candidate, baseline.manifest, ['tests/tickets.integration.test.ts']),
    featureLocalSql,
    requiredGuarantees: requiredGuarantees(arm),
  };
}

function parseArgs(args) {
  const value = (name) => {
    const index = args.indexOf(name);
    return index < 0 ? undefined : args[index + 1];
  };
  return { control: value('--control'), arm: value('--arm'), replicate: Number(value('--replicate')), candidatePath: value('--candidate'), sourceRoot: value('--source-root'), output: value('--output'), databaseUrl: value('--database-url') ?? process.env.DATABASE_URL };
}

export async function runArchitectureFitness(input) {
  const { control, arm, replicate, candidatePath, sourceRoot, output, databaseUrl = process.env.DATABASE_URL } = input;
  if (!CONTROL.has(control)) throw new Error('--control must be AF-V or AF-L');
  if (!ARM.has(arm)) throw new Error('--arm must be A, P, S, D, K, or G');
  if (!Number.isInteger(replicate) || replicate < 1) throw new Error('--replicate must be a positive integer');
  if (!candidatePath || !sourceRoot || !output) throw new Error('--candidate, --source-root, and --output are required');
  const resolvedRoot = resolve(sourceRoot);
  const resolvedCandidate = resolve(candidatePath);
  const baseline = await loadBaseline(architectureFor(control));
  const before = await walk(resolvedRoot);
  const record = {
    harness: 'af-controls-v1', protocol: 'secondary-controls-v1', control, arm, replicate,
    candidatePath: resolvedCandidate, sourceRoot: resolvedRoot,
    primaryRunner: pathToFileURL(join(PRIMARY_FIXTURES, 'runner.mjs')).href,
    baselineIntegrity: baseline.integrity ? 'pass' : 'fail',
    startedAt: new Date().toISOString(),
  };
  const primaryOutput = join(dirname(resolve(output)), 'primary-g1.json');
  try {
    if (!baseline.integrity) throw new Error('trusted baseline manifest does not match runner-owned skeleton');
    record.primaryG1 = await runBenchmark({ databaseUrl, candidatePath: resolvedCandidate, sourceRoot: resolvedRoot, workloads: ['G1'], outputPath: primaryOutput });
  } catch (error) {
    record.runnerError = { name: error?.name ?? 'Error', message: String(error?.message ?? error) };
  }
  const after = await walk(resolvedRoot);
  record.candidateSourceManifestBefore = before;
  record.candidateSourceManifestAfter = after;
  record.sourceUnchangedDuringRunner = sha(json(before)) === sha(json(after));
  record.architectureDelta = architectureDelta({ control, arm, baseline, candidate: after });
  record.deltaComplete = Boolean(record.architectureDelta?.baselineHash && record.architectureDelta?.candidateHash && Array.isArray(record.architectureDelta?.requiredGuarantees));
  record.status = record.baselineIntegrity === 'pass' && record.sourceUnchangedDuringRunner && record.deltaComplete && record.primaryG1?.status === 'P' ? 'P' : 'F';
  record.finishedAt = new Date().toISOString();
  await writeJson(output, record);
  return record;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const record = await runArchitectureFitness(parseArgs(process.argv.slice(2)));
  console.log(json({ status: record.status, output: process.argv[process.argv.indexOf('--output') + 1] ?? null, primaryStatus: record.primaryG1?.status ?? null }));
  if (record.status !== 'P') process.exitCode = 1;
}
