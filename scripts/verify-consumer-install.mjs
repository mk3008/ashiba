import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packagesRoot = path.join(repoRoot, 'packages');
const workRoot = process.env.ASHIBA_CONSUMER_SMOKE_DIR
  ? path.resolve(process.env.ASHIBA_CONSUMER_SMOKE_DIR)
  : path.join(process.platform === 'win32' ? 'C:\\tmp' : '/tmp', 'ashiba-consumer-install-smoke');
const tarballRoot = path.join(workRoot, 'tarballs');
const consumerRoot = path.join(workRoot, 'consumer');
const corepack = process.platform === 'win32' ? 'corepack.cmd' : 'corepack';

rmSync(workRoot, { recursive: true, force: true });
mkdirSync(tarballRoot, { recursive: true });
mkdirSync(consumerRoot, { recursive: true });

const packageDirs = readdirSync(packagesRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => path.join(packagesRoot, entry.name))
  .filter((dir) => existsSync(path.join(dir, 'package.json')))
  .filter((dir) => JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8')).name.startsWith('@ashiba/'));

const tarballs = new Map();

for (const packageDir of packageDirs) {
  const packageJson = JSON.parse(readFileSync(path.join(packageDir, 'package.json'), 'utf8'));
  execFileSync(corepack, ['pnpm', '--filter', packageJson.name, 'pack', '--pack-destination', tarballRoot], {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  const tarballName = `${packageJson.name.replace('@', '').replace('/', '-')}-${packageJson.version}.tgz`;
  tarballs.set(packageJson.name, `file:${normalizePath(path.join(tarballRoot, tarballName))}`);
}

writeFileSync(path.join(consumerRoot, 'package.json'), `${JSON.stringify({
  name: 'ashiba-consumer-install-smoke',
  private: true,
  type: 'module',
  packageManager: 'pnpm@10.19.0',
  dependencies: Object.fromEntries([...tarballs.entries()].sort(([left], [right]) => left.localeCompare(right))),
  pnpm: {
    overrides: Object.fromEntries([...tarballs.entries()].sort(([left], [right]) => left.localeCompare(right))),
  },
}, null, 2)}\n`, 'utf8');

execFileSync(corepack, ['pnpm', 'install'], {
  cwd: consumerRoot,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

execFileSync(corepack, ['pnpm', 'exec', 'ashiba', '--version'], {
  cwd: consumerRoot,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
execFileSync(corepack, ['pnpm', 'exec', 'ashiba', '--help'], {
  cwd: consumerRoot,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
execFileSync(corepack, ['pnpm', 'exec', 'ashiba-config', '--compact'], {
  cwd: consumerRoot,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

const importPackages = [...tarballs.keys()].filter((packageName) => packageName !== '@ashiba/cli');
execFileSync(process.execPath, ['-e', `await Promise.all(${JSON.stringify(importPackages)}.map((name) => import(name)));`], {
  cwd: consumerRoot,
  stdio: 'inherit',
});

console.log(`consumer install smoke passed: ${consumerRoot}`);

function normalizePath(value) {
  return value.replace(/\\/g, '/');
}
