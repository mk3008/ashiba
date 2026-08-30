import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = dirname(HERE);
const EVALUATION = dirname(FIXTURES);
const ARMS = new Set(['A', 'P', 'S', 'D', 'K', 'G']);
const WORKLOADS = new Set(['G1', 'T1', 'T2', 'Q1']);
const CELL = /^(G1|T1|T2|Q1)-(A|P|S|D|K|G)-r([12])$/;

function parseArgs(args) {
  const value = (name) => {
    const index = args.indexOf(name);
    return index < 0 ? undefined : args[index + 1];
  };
  return { cell: value('--cell'), destination: value('--destination'), npm: value('--npm'), install: args.includes('--install') };
}

function validateCell(cell) {
  const match = CELL.exec(cell ?? '');
  if (!match || !WORKLOADS.has(match[1]) || !ARMS.has(match[2])) throw new Error(`invalid frozen primary cell: ${cell}`);
  return { workload: match[1], arm: match[2], replicate: Number(match[3]) };
}

function run(command, args, cwd) {
  return new Promise((resolveRun, reject) => {
    const npmCli = process.platform === 'win32' && /\.cmd$/i.test(command)
      ? join(dirname(command), 'node_modules', 'npm', 'bin', 'npm-cli.js')
      : null;
    const child = spawn(npmCli ? process.execPath : command, npmCli ? [npmCli, ...args] : args, { cwd, shell: false, stdio: 'inherit', env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, ComSpec: process.env.ComSpec, TEMP: process.env.TEMP, TMP: process.env.TMP, npm_config_cache: process.env.npm_config_cache } });
    child.once('error', reject);
    child.once('exit', (code, signal) => code === 0 ? resolveRun() : reject(new Error(`${command} ${args.join(' ')} exited ${code ?? signal}`)));
  });
}

async function copyPacket({ destination, arm, workload, cell }) {
  const packetRoot = join(destination, 'packet');
  const candidateRoot = join(destination, 'candidate');
  await rm(destination, { recursive: true, force: true });
  await mkdir(candidateRoot, { recursive: true });

  // The candidate sees a copy, never a workspace link. Arm A keeps the exact
  // frozen relative file: reference by placing the supplied tarball in the
  // corresponding relative `artifacts` directory beside the copied arm packet.
  await cp(join(FIXTURES, 'packet', 'arms', arm, 'package.json'), join(candidateRoot, 'package.json'));
  await cp(join(FIXTURES, 'packet', 'arms', arm, 'package-lock.json'), join(candidateRoot, 'package-lock.json'));
  if (arm === 'A') {
    const artifacts = join(destination, 'artifacts');
    await mkdir(artifacts, { recursive: true });
    // Candidate root is destination/candidate, so rewrite only the supplied
    // path to preserve the frozen tarball identity under this clean room.
    const packagePath = join(candidateRoot, 'package.json');
    const lockPath = join(candidateRoot, 'package-lock.json');
    const artifact = join(artifacts, 'ashiba-ts-named-parameters-0.1.0.tgz');
    await cp(join(FIXTURES, 'artifacts', 'ashiba-ts-named-parameters-0.1.0.tgz'), artifact);
    for (const path of [packagePath, lockPath]) {
      const contents = await readFile(path, 'utf8');
      await writeFile(path, contents.replaceAll('file:../../../artifacts/ashiba-ts-named-parameters-0.1.0.tgz', 'file:../artifacts/ashiba-ts-named-parameters-0.1.0.tgz'));
    }
  }

  await mkdir(packetRoot, { recursive: true });
  for (const file of ['COMMON_API.md', 'schema.sql', 'seed.sql', 'q1.sql']) await cp(join(FIXTURES, file), join(packetRoot, file));
  for (const [from, to] of [
    [join(FIXTURES, 'prompts', 'COMMON_ASSIGNMENT.md'), 'COMMON_ASSIGNMENT.md'],
    [join(FIXTURES, 'prompts', `${arm}.md`), 'ARM_ASSIGNMENT.md'],
    [join(FIXTURES, 'prompts', 'workloads', `${workload}.md`), 'WORKLOAD_ASSIGNMENT.md'],
    [join(FIXTURES, 'packet', 'official-doc-snapshots-v1.zip'), 'official-doc-snapshots-v1.zip'],
    [join(FIXTURES, 'packet', 'OFFICIAL_SOURCES.md'), 'OFFICIAL_SOURCES.md'],
  ]) await cp(from, join(packetRoot, to));
  await writeFile(join(packetRoot, 'CELL.json'), `${JSON.stringify({ cell, arm, workload, replicate: Number(CELL.exec(cell)[3]), protocol: 'v2' }, null, 2)}\n`);
  return candidateRoot;
}

export async function materializeCell(options) {
  const { cell, destination, npm, install } = options;
  const parsed = validateCell(cell);
  if (!destination) throw new Error('--destination is required and must be outside the Ashiba worktree');
  const absolute = resolve(destination);
  if (absolute.startsWith(resolve(EVALUATION))) throw new Error('candidate destination must be outside the Ashiba evaluation/worktree');
  const candidateRoot = await copyPacket({ destination: absolute, ...parsed, cell });
  if (install) {
    if (!npm) throw new Error('--npm is required with --install');
    await run(npm, ['ci', '--ignore-scripts'], candidateRoot);
  }
  return { cell, candidateRoot, packetRoot: join(absolute, 'packet'), installed: Boolean(install) };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const result = await materializeCell(parseArgs(process.argv.slice(2)));
  console.log(JSON.stringify(result, null, 2));
}
