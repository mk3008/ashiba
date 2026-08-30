import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = mkdtempSync(path.join(tmpdir(), 'ashiba-golden-path-consumer-'));
const tarballs = path.join(root, 'tarballs');
const consumer = path.join(root, 'consumer');
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

try {
  mkdirSync(tarballs, { recursive: true });
  mkdirSync(consumer, { recursive: true });
  execFileSync(pnpm, ['--filter', '@ashiba-ts/named-parameters', 'pack', '--pack-destination', tarballs], { cwd: repoRoot, stdio: 'inherit', shell: process.platform === 'win32' });
  const packageJson = JSON.parse(readFileSync(path.join(repoRoot, 'packages', 'named-parameters', 'package.json'), 'utf8'));
  const tarball = path.join(tarballs, `ashiba-ts-named-parameters-${packageJson.version}.tgz`).replace(/\\/g, '/');
  writeFileSync(path.join(consumer, 'package.json'), `${JSON.stringify({
    name: 'ashiba-golden-path-consumer', private: true, type: 'module',
    dependencies: { '@ashiba-ts/named-parameters': `file:${tarball}` },
  }, null, 2)}\n`);
  mkdirSync(path.join(consumer, 'src'), { recursive: true });
  writeFileSync(path.join(consumer, 'src', 'smoke.mjs'), `import { bindNamedParameters } from '@ashiba-ts/named-parameters';
import { compileNamedParameters } from '@ashiba-ts/named-parameters/compiler';
const statement = compileNamedParameters('select id from tickets where owner = :owner or reviewer = :owner and note = :note');
const bound = bindNamedParameters(statement, { owner: 'hostile; value', note: 'review' });
if (bound.sql.includes('hostile') || bound.values[0] !== 'hostile; value') throw new Error('value was interpolated into SQL');
if (bound.sql !== 'select id from tickets where owner = $1 or reviewer = $1 and note = $2') throw new Error('deterministic lowering failed');
for (const [params, expected] of [[{ owner: 'x' }, 'Missing'], [{ owner: 'x', note: 'y', extra: true }, 'Unused']]) {
  try { bindNamedParameters(statement, params); throw new Error('validation accepted invalid parameters'); } catch (error) { if (!error.message.includes(expected)) throw error; }
}
`);
  execFileSync(pnpm, ['install', '--ignore-scripts'], { cwd: consumer, stdio: 'inherit', shell: process.platform === 'win32' });
  execFileSync(process.execPath, [path.join('src', 'smoke.mjs')], { cwd: consumer, stdio: 'inherit' });
  console.log('packed Golden Path consumer smoke passed: named-parameters only.');
} finally {
  rmSync(root, { recursive: true, force: true });
}
