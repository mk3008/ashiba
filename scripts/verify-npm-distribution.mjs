import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const expectedNpmMajor = Number(process.env.EXPECTED_NPM_MAJOR ?? 0);
const actualNpmMajor = Number(run(npm, ['--version']).split('.')[0]);
if (expectedNpmMajor && actualNpmMajor !== expectedNpmMajor) {
  throw new Error(`Expected npm ${expectedNpmMajor}.x, received ${run(npm, ['--version'])}.`);
}

const consumer = mkdtempSync(path.join(tmpdir(), 'ashiba-npm-distribution-'));
const tarballs = path.join(consumer, 'tarballs');
const env = { ...process.env, npm_config_cache: path.join(consumer, 'npm-cache'), npm_config_fund: 'false', npm_config_audit: 'false' };

try {
  mkdirSync(tarballs, { recursive: true });
  const namedVersion = JSON.parse(readFileSync(path.join(root, 'packages', 'named-parameters', 'package.json'), 'utf8')).version;
  const dependencies = Object.fromEntries(['cli', 'named-parameters'].map((packageDir) => {
    const source = path.join(root, 'packages', packageDir);
    const staging = path.join(consumer, 'staging', packageDir);
    mkdirSync(staging, { recursive: true });
    cpSync(path.join(source, 'dist'), path.join(staging, 'dist'), { recursive: true });
    cpSync(path.join(source, 'README.md'), path.join(staging, 'README.md'));
    const manifest = JSON.parse(readFileSync(path.join(source, 'package.json'), 'utf8'));
    if (packageDir === 'cli') manifest.dependencies['@ashiba-ts/named-parameters'] = `^${namedVersion}`;
    writeFileSync(path.join(staging, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    const packed = JSON.parse(run(npm, ['pack', '--json', '--ignore-scripts', '--pack-destination', tarballs], staging, env))[0];
    const name = packageDir === 'cli' ? '@ashiba-ts/cli' : '@ashiba-ts/named-parameters';
    return [name, `file:${path.join(tarballs, packed.filename).replace(/\\/g, '/')}`];
  }));

  writeFileSync(path.join(consumer, 'package.json'), `${JSON.stringify({
    name: 'ashiba-npm-distribution-proof', private: true, type: 'module',
    dependencies: { ...dependencies, pg: '^8.16.3' },
    devDependencies: { '@types/node': '^22.13.10', '@types/pg': '^8.15.5', typescript: '^5.9.3' },
  }, null, 2)}\n`);
  mkdirSync(path.join(consumer, 'src'), { recursive: true });
  writeFileSync(path.join(consumer, 'src', 'tickets.sql'), 'select id, subject from tickets where status = :status limit :limit\n');
  writeFileSync(path.join(consumer, 'src', 'smoke.ts'), `import { bindNamedParameters } from '@ashiba-ts/named-parameters';
import { Pool } from 'pg';
const bound = bindNamedParameters({ style: 'indexed', sql: 'select $1', parameterNames: ['status'] }, { status: 'open' });
void bound; void Pool;
`);
  writeFileSync(path.join(consumer, 'tsconfig.json'), '{"compilerOptions":{"module":"NodeNext","moduleResolution":"NodeNext","strict":true,"noEmit":true}}\n');

  run(npm, ['install', '--ignore-scripts', '--no-audit', '--no-fund'], consumer, env);
  const bin = path.join(consumer, 'node_modules', '.bin', process.platform === 'win32' ? 'ashiba.cmd' : 'ashiba');
  run(bin, ['model-gen', 'src/tickets.sql', '--out', 'src/tickets.bindings.ts'], consumer, env);
  run(bin, ['model-gen', 'src/tickets.sql', '--out', 'src/tickets.bindings.ts', '--check'], consumer, env);
  run(path.join(consumer, 'node_modules', '.bin', process.platform === 'win32' ? 'tsc.cmd' : 'tsc'), ['--noEmit'], consumer, env);
  writeFileSync(path.join(consumer, 'src', 'runtime-smoke.mjs'), "import { bindNamedParameters } from '@ashiba-ts/named-parameters';\nconst value = 'hostile; value';\nconst result = bindNamedParameters({ style: 'indexed', sql: 'select $1', parameterNames: ['status'] }, { status: value });\nif (result.sql !== 'select $1' || result.values[0] !== value) throw new Error('binding smoke failed');\n");
  run(process.execPath, [path.join('src', 'runtime-smoke.mjs')], consumer, env);
  const lock = readFileSync(path.join(consumer, 'package-lock.json'), 'utf8');
  if (lock.includes('workspace:') || lock.includes(root.replace(/\\/g, '/'))) throw new Error('Consumer lockfile contains a workspace dependency.');
  console.log(`npm distribution proof passed: Node ${process.versions.node}, npm ${run(npm, ['--version'])}.`);
} finally {
  rmSync(consumer, { recursive: true, force: true });
}

function run(command, args, cwd = root, env = process.env) {
  return execFileSync(command, args, { cwd, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' && /\.(cmd|bat)$/i.test(command) }).trim();
}
