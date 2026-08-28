import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = mkdtempSync(path.join(tmpdir(), 'ashiba-golden-path-tutorial-'));
const cli = path.join(repoRoot, 'packages', 'cli', 'dist', 'index.js');
try {
  writeFileSync(path.join(root, 'users.sql'), 'select id from users where id = :id\n');
  execFileSync(process.execPath, [cli, 'model-gen', 'users.sql', '--out', 'users.bindings.ts'], { cwd: root, stdio: 'inherit' });
  execFileSync(process.execPath, [cli, 'model-gen', 'users.sql', '--out', 'users.bindings.ts', '--check'], { cwd: root, stdio: 'inherit' });
  if (!readFileSync(path.join(root, 'users.bindings.ts'), 'utf8').includes('$1')) throw new Error('Tutorial did not produce indexed PostgreSQL binding metadata.');
  console.log(`Golden Path tutorial smoke passed: ${root}`);
} finally { rmSync(root, { recursive: true, force: true }); }
