import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const baseDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(baseDir, '..', '..', '..', '..');
const cli = path.join(rootDir, 'packages', 'cli', 'dist', 'index.js');
const generated = path.join(baseDir, 'generated', 'read-current.bindings.ts');
const tempDir = mkdtempSync(path.join(tmpdir(), 'ashiba-architecture-stale-'));
const staleSql = path.join(tempDir, 'read-current.sql');

copyFileSync(path.join(baseDir, 'fixtures', 'read-current.sql'), staleSql);
writeFileSync(staleSql, `${execFileSync(process.execPath, ['-e', `process.stdout.write(require('node:fs').readFileSync(${JSON.stringify(staleSql)}, 'utf8'))`], { encoding: 'utf8' })}\n-- stale drift\n`, 'utf8');

let exitCode = 0;
let stderr = '';

try {
  execFileSync(process.execPath, [
    cli,
    'model-gen',
    staleSql,
    '--out',
    generated,
    '--check',
  ], {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: 'pipe',
  });
} catch (error) {
  exitCode = error && typeof error === 'object' && 'status' in error && typeof error.status === 'number' ? error.status : 1;
  stderr = error && typeof error === 'object' && 'stderr' in error ? String(error.stderr) : String(error);
}

rmSync(tempDir, { recursive: true, force: true });

process.stdout.write(`${JSON.stringify({
  generated: path.relative(baseDir, generated).replaceAll(path.sep, '/'),
  exitCode,
  failedAsExpected: exitCode !== 0,
  stderr: stderr.trim(),
}, null, 2)}\n`);
