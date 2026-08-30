import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// This verifier intentionally checks the historical packet commit in a
// detached worktree. The correction ledger is append-only and therefore is
// allowed to differ on the current publication branch after the packet was
// frozen. Do not regenerate the packet's expected hashes at the final HEAD.
const FREEZE_SHA = '7988e3bedb84ee918c928afa33a58dbbcf826a37';
const evaluationRoot = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(evaluationRoot, '..', '..', '..');
const evaluationRelativePath = relative(repositoryRoot, evaluationRoot);
const worktreePrefix = join(tmpdir(), 'ashiba-v3-frozen-packet-');

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', windowsHide: true });
  return {
    command: [command, ...args].join(' '),
    status: result.status,
    signal: result.signal,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    error: result.error?.message,
  };
}

if (!existsSync(join(repositoryRoot, '.git'))) {
  throw new Error(`repository root does not contain .git: ${repositoryRoot}`);
}

const worktreePath = mkdtempSync(worktreePrefix);
let added = false;
let cleanup = { attempted: false, status: null, error: null };
let addResult;
let verifyResult;
try {
  addResult = run('git', ['worktree', 'add', '--detach', worktreePath, FREEZE_SHA], repositoryRoot);
  if (addResult.status !== 0) throw new Error(`git worktree add failed: ${addResult.stderr || addResult.error || 'unknown error'}`);
  added = true;
  verifyResult = run(process.execPath, ['fixtures/packet/packet-hash.mjs'], join(worktreePath, evaluationRelativePath));
} finally {
  if (added) {
    const result = run('git', ['worktree', 'remove', '--force', worktreePath], repositoryRoot);
    cleanup = { attempted: true, status: result.status, error: result.status === 0 ? null : (result.stderr || result.error || 'unknown error') };
  } else if (existsSync(worktreePath)) {
    rmSync(worktreePath, { recursive: true, force: true });
    cleanup = { attempted: true, status: 0, error: null };
  }
}

const output = {
  status: verifyResult?.status === 0 && cleanup.status === 0 ? 'PASS' : 'FAIL',
  freezeSha: FREEZE_SHA,
  repositoryRoot,
  worktreePath,
  verifierWorkingDirectory: join(worktreePath, evaluationRelativePath),
  packetVerifier: verifyResult,
  cleanup,
  note: 'The final branch may append correction records; the frozen packet is verified at its freeze SHA and is not re-hashed at final HEAD.',
};
console.log(JSON.stringify(output, null, 2));
if (output.status !== 'PASS') process.exitCode = 1;
