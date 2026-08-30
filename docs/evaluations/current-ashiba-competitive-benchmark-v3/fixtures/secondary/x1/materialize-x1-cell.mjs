import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(HERE, '..', '..');
const EVALUATION = dirname(FIXTURES);
const CELL = /^X1-(A|P|S|D|K|G)-r1$/;

function parseArgs(args) {
  const value = (name) => { const index = args.indexOf(name); return index < 0 ? undefined : args[index + 1]; };
  return { cell: value('--cell'), destination: value('--destination'), npm: value('--npm'), cache: value('--cache'), install: args.includes('--install') };
}

function install(command, cwd, cache) {
  return new Promise((resolveInstall, reject) => {
    const cli = process.platform === 'win32' && /\.cmd$/i.test(command) ? join(dirname(command), 'node_modules', 'npm', 'bin', 'npm-cli.js') : null;
    const child = spawn(cli ? process.execPath : command, cli ? [cli, 'ci', '--ignore-scripts'] : ['ci', '--ignore-scripts'], { cwd, shell: false, stdio: 'inherit', env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, ComSpec: process.env.ComSpec, TEMP: process.env.TEMP, TMP: process.env.TMP, npm_config_cache: cache } });
    child.once('error', reject);
    child.once('exit', (code) => code === 0 ? resolveInstall() : reject(new Error(`npm ci exited ${code}`)));
  });
}

export async function materializeX1Cell({ cell, destination, npm, cache, install: shouldInstall }) {
  const match = CELL.exec(cell ?? '');
  if (!match) throw new Error('cell must be X1 × A|P|S|D|K|G × r1');
  if (!destination) throw new Error('--destination is required');
  const absolute = resolve(destination);
  if (absolute.startsWith(resolve(EVALUATION))) throw new Error('destination must be outside repository evaluation tree');
  const arm = match[1];
  const candidateRoot = join(absolute, 'candidate');
  const packetRoot = join(absolute, 'packet');
  const evidenceRoot = join(absolute, 'evidence');
  const npmCache = cache ?? join(absolute, 'npm-cache');
  await rm(absolute, { recursive: true, force: true });
  await Promise.all([mkdir(candidateRoot, { recursive: true }), mkdir(packetRoot, { recursive: true }), mkdir(evidenceRoot, { recursive: true }), mkdir(npmCache, { recursive: true })]);
  await cp(join(FIXTURES, 'packet', 'arms', arm, 'package.json'), join(candidateRoot, 'package.json'));
  await cp(join(FIXTURES, 'packet', 'arms', arm, 'package-lock.json'), join(candidateRoot, 'package-lock.json'));
  if (arm === 'A') {
    const artifacts = join(absolute, 'artifacts');
    await mkdir(artifacts, { recursive: true });
    await cp(join(FIXTURES, 'artifacts', 'ashiba-ts-named-parameters-0.1.0.tgz'), join(artifacts, 'ashiba-ts-named-parameters-0.1.0.tgz'));
    for (const path of [join(candidateRoot, 'package.json'), join(candidateRoot, 'package-lock.json')]) await writeFile(path, (await readFile(path, 'utf8')).replaceAll('file:../../../artifacts/ashiba-ts-named-parameters-0.1.0.tgz', 'file:../artifacts/ashiba-ts-named-parameters-0.1.0.tgz'));
  }
  const packet = [
    [join(FIXTURES, 'COMMON_API.md'), 'COMMON_API.md'], [join(FIXTURES, 'schema.sql'), 'schema.sql'], [join(FIXTURES, 'seed.sql'), 'seed.sql'],
    [join(FIXTURES, 'prompts', 'COMMON_ASSIGNMENT.md'), 'COMMON_ASSIGNMENT.md'], [join(FIXTURES, 'prompts', arm + '.md'), 'ARM_ASSIGNMENT.md'],
    [join(HERE, 'X1_ASSIGNMENT.md'), 'X1_ASSIGNMENT.md'], [join(HERE, 'RUNNER_API.md'), 'RUNNER_API.md'],
    [join(FIXTURES, 'packet', 'OFFICIAL_SOURCES.md'), 'OFFICIAL_SOURCES.md'], [join(FIXTURES, 'packet', 'official-doc-snapshots-v1.zip'), 'official-doc-snapshots-v1.zip'],
  ];
  for (const [from, to] of packet) await cp(from, join(packetRoot, to));
  await writeFile(join(packetRoot, 'CELL.json'), `${JSON.stringify({ cell, control: 'X1', arm, replicate: 1, protocol: 'secondary-controls-v1' }, null, 2)}\n`);
  if (shouldInstall) { if (!npm) throw new Error('--npm is required with --install'); await install(npm, candidateRoot, npmCache); }
  return { cell, arm, candidateRoot, packetRoot, evidenceRoot, npmCache, installed: Boolean(shouldInstall) };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) console.log(JSON.stringify(await materializeX1Cell(parseArgs(process.argv.slice(2))), null, 2));
