import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const expectedNpmMajor = Number(process.env.EXPECTED_NPM_MAJOR ?? 0);
const npmVersion = run(npm, ['--version']);
const actualNpmMajor = Number(npmVersion.split('.')[0]);
if (expectedNpmMajor && actualNpmMajor !== expectedNpmMajor) throw new Error(`Expected npm ${expectedNpmMajor}.x, received ${npmVersion}.`);

const consumer = mkdtempSync(path.join(tmpdir(), 'ashiba-npm-distribution-'));
const tarballs = path.join(consumer, 'tarballs');
const env = { ...process.env, npm_config_cache: path.join(consumer, 'npm-cache'), npm_config_fund: 'false', npm_config_audit: 'false' };

try {
  const packageDir = path.join(root, 'packages', 'named-parameters');
  const staging = path.join(consumer, 'staging');
  mkdirSync(tarballs, { recursive: true });
  mkdirSync(staging, { recursive: true });
  cpSync(path.join(packageDir, 'dist'), path.join(staging, 'dist'), { recursive: true });
  cpSync(path.join(packageDir, 'README.md'), path.join(staging, 'README.md'));
  cpSync(path.join(packageDir, 'package.json'), path.join(staging, 'package.json'));
  const packed = JSON.parse(run(npm, ['pack', '--json', '--ignore-scripts', '--pack-destination', tarballs], staging))[0];
  const tarball = path.join(tarballs, packed.filename).replace(/\\/g, '/');

  writeFileSync(path.join(consumer, 'package.json'), `${JSON.stringify({
    name: 'ashiba-npm-distribution-proof', private: true, type: 'module',
    dependencies: { '@ashiba-ts/named-parameters': `file:${tarball}` },
    devDependencies: { typescript: '^5.9.3', '@types/node': '^22.13.10' },
  }, null, 2)}\n`);
  mkdirSync(path.join(consumer, 'src'), { recursive: true });
  writeFileSync(path.join(consumer, 'src', 'smoke.ts'), `import { bindNamedParameters } from '@ashiba-ts/named-parameters';
import { compileNamedParameters } from '@ashiba-ts/named-parameters/compiler';

const statement = compileNamedParameters('select * from tickets where status = :status or status = :status limit :limit');
const bound = bindNamedParameters(statement, { status: 'open', limit: 10 });
if (bound.sql !== 'select * from tickets where status = $1 or status = $1 limit $2') throw new Error('indexed lowering failed');
if (bound.values[0] !== 'open' || bound.values[1] !== 'open' || bound.values[2] !== 10) throw new Error('repeated binding failed');
try { bindNamedParameters(statement, { status: 'open' }); throw new Error('missing parameter accepted'); } catch (error) { if (error instanceof Error && !error.message.includes('Missing')) throw error; }
try { bindNamedParameters(statement, { status: 'open', limit: 10, extra: true }); throw new Error('unused parameter accepted'); } catch (error) { if (error instanceof Error && !error.message.includes('Unused')) throw error; }
const hostile = 'open\\'; drop table tickets; --';
const hostileBound = bindNamedParameters(statement, { status: hostile, limit: 10 });
if (hostileBound.sql.includes(hostile) || hostileBound.values[0] !== hostile) throw new Error('hostile value was interpolated');
`);
  writeFileSync(path.join(consumer, 'tsconfig.json'), `${JSON.stringify({ compilerOptions: { module: 'NodeNext', moduleResolution: 'NodeNext', strict: true, noEmit: true }, include: ['src/**/*.ts'] })}\n`);

  run(npm, ['install', '--ignore-scripts', '--no-audit', '--no-fund'], consumer, env);
  run(path.join(consumer, 'node_modules', '.bin', process.platform === 'win32' ? 'tsc.cmd' : 'tsc'), ['--noEmit'], consumer, env);
  run(process.execPath, ['--input-type=module', '-e', `import { bindNamedParameters } from '@ashiba-ts/named-parameters'; import { compileNamedParameters } from '@ashiba-ts/named-parameters/compiler'; const statement = compileNamedParameters('select :value'); const value = 'hostile; value'; const bound = bindNamedParameters(statement, { value }); if (bound.sql !== 'select $1' || bound.values[0] !== value) throw new Error('runtime binding smoke failed');`], consumer, env);

  const lock = readFileSync(path.join(consumer, 'package-lock.json'), 'utf8');
  if (lock.includes('workspace:') || lock.includes(root.replace(/\\/g, '/'))) throw new Error('Consumer lockfile contains a workspace dependency.');
  console.log(`npm distribution proof passed: Node ${process.versions.node}, npm ${npmVersion}, package @ashiba-ts/named-parameters only.`);
} finally {
  rmSync(consumer, { recursive: true, force: true });
}

function run(command, args, cwd = root, commandEnv = process.env) {
  return execFileSync(command, args, {
    cwd,
    env: commandEnv,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32' && /\.(cmd|bat)$/i.test(command) ? 'cmd.exe' : false,
  }).trim();
}
