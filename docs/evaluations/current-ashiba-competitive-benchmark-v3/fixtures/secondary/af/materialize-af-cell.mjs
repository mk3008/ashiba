import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(HERE, '..', '..');
const EVALUATION = dirname(FIXTURES);
const CELL = /^(AF-V|AF-L)-(A|P|S|D|K|G)-r([12])$/;

function parseArgs(args) {
  const value = (name) => {
    const index = args.indexOf(name);
    return index < 0 ? undefined : args[index + 1];
  };
  return { cell: value('--cell'), destination: value('--destination'), npm: value('--npm'), cache: value('--cache'), install: args.includes('--install') };
}

function parseCell(cell) {
  const match = CELL.exec(cell ?? '');
  if (!match) throw new Error('cell must be AF-V|AF-L × A|P|S|D|K|G × r1|r2');
  return { control: match[1], arm: match[2], replicate: Number(match[3]) };
}

function run(command, args, cwd, cache) {
  return new Promise((resolveRun, reject) => {
    const npmCli = process.platform === 'win32' && /\.cmd$/i.test(command)
      ? join(dirname(command), 'node_modules', 'npm', 'bin', 'npm-cli.js')
      : null;
    const child = spawn(npmCli ? process.execPath : command, npmCli ? [npmCli, ...args] : args, {
      cwd, shell: false, stdio: 'inherit',
      env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, ComSpec: process.env.ComSpec, TEMP: process.env.TEMP, TMP: process.env.TMP, npm_config_cache: cache },
    });
    child.once('error', reject);
    child.once('exit', (code, signal) => code === 0 ? resolveRun() : reject(new Error(`${command} ${args.join(' ')} exited ${code ?? signal}`)));
  });
}

async function copyPacket(destination, { cell, control, arm, replicate }) {
  const candidateRoot = join(destination, 'candidate');
  const packetRoot = join(destination, 'packet');
  const evidenceRoot = join(destination, 'evidence');
  const npmCache = join(destination, 'npm-cache');
  await rm(destination, { recursive: true, force: true });
  await mkdir(candidateRoot, { recursive: true });
  await mkdir(packetRoot, { recursive: true });
  await mkdir(evidenceRoot, { recursive: true });
  await mkdir(npmCache, { recursive: true });

  const architecture = control === 'AF-V' ? 'vsa' : 'layered';
  await cp(join(HERE, 'baselines', architecture), candidateRoot, { recursive: true, filter: (path) => !path.endsWith('BASELINE_MANIFEST.json') });
  await cp(join(FIXTURES, 'packet', 'arms', arm, 'package.json'), join(candidateRoot, 'package.json'));
  await cp(join(FIXTURES, 'packet', 'arms', arm, 'package-lock.json'), join(candidateRoot, 'package-lock.json'));
  if (arm === 'A') {
    const artifacts = join(destination, 'artifacts');
    await mkdir(artifacts, { recursive: true });
    const artifact = join(artifacts, 'ashiba-ts-named-parameters-0.1.0.tgz');
    await cp(join(FIXTURES, 'artifacts', 'ashiba-ts-named-parameters-0.1.0.tgz'), artifact);
    for (const manifest of [join(candidateRoot, 'package.json'), join(candidateRoot, 'package-lock.json')]) {
      const content = await readFile(manifest, 'utf8');
      await writeFile(manifest, content.replaceAll('file:../../../artifacts/ashiba-ts-named-parameters-0.1.0.tgz', 'file:../artifacts/ashiba-ts-named-parameters-0.1.0.tgz'));
    }
  }
  const copied = [
    [join(FIXTURES, 'COMMON_API.md'), 'COMMON_API.md'],
    [join(FIXTURES, 'schema.sql'), 'schema.sql'],
    [join(FIXTURES, 'seed.sql'), 'seed.sql'],
    [join(FIXTURES, 'prompts', 'COMMON_ASSIGNMENT.md'), 'COMMON_ASSIGNMENT.md'],
    [join(FIXTURES, 'prompts', 'workloads', 'G1.md'), 'G1_ASSIGNMENT.md'],
    [join(FIXTURES, 'prompts', `${arm}.md`), 'ARM_ASSIGNMENT.md'],
    [join(HERE, control === 'AF-V' ? 'AF_V_ASSIGNMENT.md' : 'AF_L_ASSIGNMENT.md'), 'ARCHITECTURE_ASSIGNMENT.md'],
    [join(FIXTURES, 'packet', 'OFFICIAL_SOURCES.md'), 'OFFICIAL_SOURCES.md'],
    [join(FIXTURES, 'packet', 'official-doc-snapshots-v1.zip'), 'official-doc-snapshots-v1.zip'],
  ];
  for (const [from, name] of copied) await cp(from, join(packetRoot, name));
  await writeFile(join(packetRoot, 'CELL.json'), `${JSON.stringify({ cell, control, arm, replicate, workload: 'G1', protocol: 'secondary-controls-v1', architectureHarness: 'af-controls-v1' }, null, 2)}\n`);
  return { candidateRoot, packetRoot, evidenceRoot, npmCache };
}

export async function materializeAfCell(options) {
  const { cell, destination, npm, cache, install } = options;
  const parsed = parseCell(cell);
  if (!destination) throw new Error('--destination is required');
  const absolute = resolve(destination);
  if (absolute.startsWith(resolve(EVALUATION))) throw new Error('destination must be outside the repository evaluation tree');
  const materialized = await copyPacket(absolute, { cell, ...parsed });
  if (install) {
    if (!npm) throw new Error('--npm is required with --install');
    await run(npm, ['ci', '--ignore-scripts'], materialized.candidateRoot, cache ?? materialized.npmCache);
  }
  return { cell, ...parsed, ...materialized, installed: Boolean(install) };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  console.log(JSON.stringify(await materializeAfCell(parseArgs(process.argv.slice(2))), null, 2));
}
