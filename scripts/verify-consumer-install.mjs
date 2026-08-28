import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = mkdtempSync(path.join(tmpdir(), 'ashiba-golden-path-consumer-'));
const tarballs = path.join(root, 'tarballs');
const consumer = path.join(root, 'consumer');
const corepack = process.platform === 'win32' ? 'corepack.cmd' : 'corepack';

mkdirSync(tarballs, { recursive: true });
mkdirSync(consumer, { recursive: true });

const packed = new Map();
for (const name of ['@ashiba-ts/cli', '@ashiba-ts/named-parameters']) {
  execFileSync(corepack, ['pnpm', '--filter', name, 'pack', '--pack-destination', tarballs], { cwd: repoRoot, stdio: 'inherit', shell: process.platform === 'win32' });
  const packageJson = JSON.parse(readFileSync(path.join(repoRoot, 'packages', name.split('/')[1], 'package.json'), 'utf8'));
  packed.set(name, `file:${path.join(tarballs, `${name.replace('@', '').replace('/', '-')}-${packageJson.version}.tgz`).replace(/\\/g, '/')}`);
}

writeFileSync(path.join(consumer, 'package.json'), `${JSON.stringify({
  name: 'ashiba-golden-path-consumer', private: true, type: 'module', packageManager: 'pnpm@10.19.0',
  dependencies: Object.fromEntries(packed), pnpm: { overrides: Object.fromEntries(packed) },
}, null, 2)}\n`);
mkdirSync(path.join(consumer, 'src'), { recursive: true });
writeFileSync(path.join(consumer, 'src', 'tickets.sql'), 'select id from tickets where owner = :owner or reviewer = :owner and note = :note\n');
execFileSync(corepack, ['pnpm', 'install'], { cwd: consumer, stdio: 'inherit', shell: process.platform === 'win32' });
execFileSync(corepack, ['pnpm', 'exec', 'ashiba', 'model-gen', 'src/tickets.sql', '--out', 'src/tickets.bindings.ts'], { cwd: consumer, stdio: 'inherit', shell: process.platform === 'win32' });
execFileSync(corepack, ['pnpm', 'exec', 'ashiba', 'model-gen', 'src/tickets.sql', '--out', 'src/tickets.bindings.ts', '--check'], { cwd: consumer, stdio: 'inherit', shell: process.platform === 'win32' });
const bindings = readFileSync(path.join(consumer, 'src', 'tickets.bindings.ts'), 'utf8');
if (!bindings.includes('$1') || !bindings.includes('"owner"') || bindings.includes('owner value')) throw new Error('Packed Golden Path metadata was not deterministic or value-free.');
execFileSync(process.execPath, ['--input-type=module', '-e', "import { bindNamedParameters } from '@ashiba-ts/named-parameters'; const prepared={sql:'select $1',parameterNames:['owner']}; const bound=bindNamedParameters(prepared,{owner:'hostile; value'}); if(bound.values[0] !== 'hostile; value') throw new Error('binding failed');"], { cwd: consumer, stdio: 'inherit' });
if (existsSync(path.join(consumer, 'src', 'features'))) throw new Error('Golden Path consumer unexpectedly received a feature scaffold.');
console.log(`packed Golden Path consumer smoke passed: ${consumer}`);
