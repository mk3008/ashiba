import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packagesRoot = path.join(repoRoot, 'packages');
const workRoot = process.env.ASHIBA_CUSTOMER_TUTORIAL_DIR
  ? path.resolve(process.env.ASHIBA_CUSTOMER_TUTORIAL_DIR)
  : path.join(process.platform === 'win32' ? 'C:\\tmp' : '/tmp', 'ashiba-customer-tutorial-smoke');
const tarballRoot = path.join(workRoot, 'tarballs');
const bootstrapRoot = path.join(workRoot, 'bootstrap');
const starterRoot = path.join(workRoot, 'starter');
const corepack = process.platform === 'win32' ? 'corepack.cmd' : 'corepack';
const docker = process.platform === 'win32' ? 'docker.exe' : 'docker';
const withDocker = process.argv.includes('--with-docker');
const dockerPort = withDocker ? await findFreePort() : null;

rmSync(workRoot, { recursive: true, force: true });
mkdirSync(tarballRoot, { recursive: true });
mkdirSync(bootstrapRoot, { recursive: true });

const packageDirs = readdirSync(packagesRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => path.join(packagesRoot, entry.name))
  .filter((dir) => existsSync(path.join(dir, 'package.json')))
  .filter((dir) => readPackageJson(dir).name.startsWith('@ashiba/'));

const tarballs = new Map();

for (const packageDir of packageDirs) {
  const packageJson = readPackageJson(packageDir);
  run(corepack, ['pnpm', '--filter', packageJson.name, 'pack', '--pack-destination', tarballRoot], repoRoot);
  const tarballName = `${packageJson.name.replace('@', '').replace('/', '-')}-${packageJson.version}.tgz`;
  tarballs.set(packageJson.name, `file:${normalizePath(path.join(tarballRoot, tarballName))}`);
}

const cliTarball = tarballs.get('@ashiba/cli');
if (!cliTarball) {
  throw new Error('Missing @ashiba/cli tarball.');
}

writePackageJson(bootstrapRoot, {
  name: 'ashiba-customer-tutorial-bootstrap',
  private: true,
  type: 'module',
  packageManager: 'pnpm@10.19.0',
  devDependencies: {
    '@ashiba/cli': cliTarball,
  },
  pnpm: {
    overrides: sortedObject(tarballs),
  },
});

run(corepack, ['pnpm', 'install'], bootstrapRoot);
run(corepack, [
  'pnpm',
  'exec',
  'ashiba',
  'init',
  '--dir',
  starterRoot,
  '--with-demo-ddl',
  '--with-migration-demo-ddl',
], bootstrapRoot);

const generatedPackageJson = readPackageJson(starterRoot);
generatedPackageJson.packageManager = 'pnpm@10.19.0';
generatedPackageJson.pnpm = {
  ...(typeof generatedPackageJson.pnpm === 'object' && generatedPackageJson.pnpm !== null
    ? generatedPackageJson.pnpm
    : {}),
  overrides: sortedObject(tarballs),
};
writePackageJson(starterRoot, generatedPackageJson);

assertFileContains(path.join(starterRoot, 'compose.yaml'), '${ASHIBA_TEST_DATABASE_PORT:-5432}:5432');
assertFileContains(path.join(starterRoot, 'compose.yaml'), 'network_mode: bridge');
assertFileContains(path.join(starterRoot, '.env.example'), 'ASHIBA_TEST_DATABASE_PORT=5432');
assertFileContains(path.join(starterRoot, 'tests', 'support', 'setup-env.ts'), 'ASHIBA_TEST_DATABASE_URL');
assertFileContains(path.join(starterRoot, 'tests', 'support', 'ztd', 'harness.ts'), 'runQuerySpecZtdCases');
assertFileContains(path.join(starterRoot, 'tests', 'support', 'ztd', 'verifier.ts'), '@rawsql-ts/testkit-postgres');
assertFileContains(path.join(starterRoot, 'db', 'ddl', 'public.sql'), 'email text not null');
assertFileContains(path.join(starterRoot, 'tmp', 'ddl', 'production.sql'), 'create table public.users');
assertFileContains(path.join(starterRoot, 'src', 'features', 'smoke', 'queries', 'smoke', 'tests', 'cases', 'basic.case.ts'), 'alice@example.com');
assertFileContains(path.join(starterRoot, 'package.json'), '@ashiba/driver-adapter-pg');
assertFileContains(path.join(starterRoot, 'package.json'), '@rawsql-ts/testkit-postgres');
assertFileContains(path.join(starterRoot, 'package.json'), '@ashiba/cli');
assertFileContains(path.join(starterRoot, 'README.md'), 'docker compose up -d');

copyFileSync(path.join(starterRoot, '.env.example'), path.join(starterRoot, '.env'));
if (dockerPort) {
  writeFileSync(path.join(starterRoot, '.env'), `ASHIBA_TEST_DATABASE_PORT=${dockerPort}\n`, 'utf8');
}

run(corepack, ['pnpm', 'install'], starterRoot);

try {
  if (withDocker) {
    run(docker, ['compose', 'up', '-d'], starterRoot);
    waitForPostgres(starterRoot, dockerPort);
  }
  run(corepack, ['pnpm', 'test'], starterRoot, withDocker ? {} : { ASHIBA_SKIP_DB_BACKED_TESTS: '1' });
  run(corepack, ['pnpm', 'exec', 'ashiba', 'feature', 'scaffold', '--table', 'users', '--action', 'list', '--dry-run'], starterRoot);
  run(corepack, ['pnpm', 'exec', 'ashiba', 'feature', 'scaffold', '--table', 'users', '--action', 'list'], starterRoot);
  assertFileContains(path.join(starterRoot, 'src', 'features', 'users-list', 'queries', 'list', 'list.sql'), 'from "public"."users"');
  run(corepack, ['pnpm', 'test'], starterRoot, withDocker ? {} : { ASHIBA_SKIP_DB_BACKED_TESTS: '1' });
  run(corepack, ['pnpm', 'exec', 'ashiba', 'feature', 'scaffold', '--table', 'users', '--action', 'insert', '--dry-run'], starterRoot);
  run(corepack, ['pnpm', 'exec', 'ashiba', 'feature', 'scaffold', '--table', 'users', '--action', 'insert'], starterRoot);
  assertFileContains(path.join(starterRoot, 'src', 'features', 'users-insert', 'queries', 'insert-users', 'tests', 'cases', 'basic.case.ts'), 'inserts insert-users row');
  run(corepack, ['pnpm', 'test'], starterRoot, withDocker ? {} : { ASHIBA_SKIP_DB_BACKED_TESTS: '1' });
  run(corepack, [
    'pnpm',
    'exec',
    'ashiba',
    'ddl',
    'migration',
    'generate',
    '--from',
    'tmp/ddl/production.sql',
    '--to',
    'db/ddl/public.sql',
    '--out',
    'tmp/ddl/migration.sql',
    '--dry-run',
  ], starterRoot);
  if (existsSync(path.join(starterRoot, 'tmp', 'ddl', 'migration.sql'))) {
    throw new Error('Dry-run migration unexpectedly wrote tmp/ddl/migration.sql.');
  }
  run(corepack, [
    'pnpm',
    'exec',
    'ashiba',
    'ddl',
    'migration',
    'generate',
    '--from',
    'tmp/ddl/production.sql',
    '--to',
    'db/ddl/public.sql',
    '--out',
    'tmp/ddl/migration.sql',
  ], starterRoot);
  assertFileContains(path.join(starterRoot, 'tmp', 'ddl', 'migration.sql'), 'email');
  run(corepack, ['pnpm', 'exec', 'ashiba', '--help'], starterRoot);
  run(corepack, ['pnpm', 'exec', 'ashiba-config', '--compact'], starterRoot);
} finally {
  if (withDocker) {
    try {
      run(docker, ['compose', 'down', '--volumes'], starterRoot);
    } catch (error) {
      console.warn(`docker compose cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

console.log(`customer tutorial smoke passed: ${starterRoot}`);

function run(command, args, cwd, extraEnv = {}) {
  execFileSync(command, args, {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, ...extraEnv },
  });
}

function runDirect(command, args, cwd, extraEnv = {}) {
  execFileSync(command, args, {
    cwd,
    stdio: 'inherit',
    shell: false,
    env: { ...process.env, ...extraEnv },
  });
}

function readPackageJson(directory) {
  return JSON.parse(readFileSync(path.join(directory, 'package.json'), 'utf8'));
}

function writePackageJson(directory, value) {
  mkdirSync(directory, { recursive: true });
  writeFileSync(path.join(directory, 'package.json'), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function sortedObject(entries) {
  return Object.fromEntries([...entries.entries()].sort(([left], [right]) => left.localeCompare(right)));
}

function assertFileContains(filePath, expected) {
  if (!existsSync(filePath)) {
    throw new Error(`Expected file does not exist: ${filePath}`);
  }
  const contents = readFileSync(filePath, 'utf8');
  if (!contents.includes(expected)) {
    throw new Error(`Expected ${filePath} to contain: ${expected}`);
  }
}

function normalizePath(value) {
  return value.replace(/\\/g, '/');
}

function waitForPostgres(cwd, port) {
  const script = `
    const pg = await import('pg');
    const url = process.env.ASHIBA_TEST_DATABASE_URL;
    let lastError;
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const client = new pg.default.Client({ connectionString: url });
      try {
        await client.connect();
        await client.query('select 1');
        await client.end();
        process.exit(0);
      } catch (error) {
        lastError = error;
        try { await client.end(); } catch {}
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
    console.error(lastError);
    process.exit(1);
  `;
  runDirect(process.execPath, ['-e', script], cwd, {
    ASHIBA_TEST_DATABASE_URL: `postgres://postgres:postgres@localhost:${port}/ashiba`,
  });
}

function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => {
        if (typeof address === 'object' && address !== null) {
          resolve(address.port);
          return;
        }
        reject(new Error('Failed to reserve a free local port for Docker Compose.'));
      });
    });
  });
}
