import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = process.cwd();
const cli = resolve(root, '../../packages/cli/dist/index.js');
const url = process.env.DATABASE_URL;

if (!url) throw new Error('DATABASE_URL is required.');

const items = [
  ['list.sql', 'Ticket', 'ListParams'],
  ['get.sql', 'Ticket', 'GetParams'],
  ['assign.sql', 'Ticket', 'AssignParams'],
  ['audit.sql', undefined, 'AuditParams'],
];

const call = (args, stdio = 'inherit') => execFileSync(
  process.execPath,
  [cli, 'postgres-contract', ...args],
  { cwd: root, env: { ...process.env, DATABASE_URL: url }, stdio },
);

for (const [sql] of items) {
  call(['write', `src/tickets/${sql}`, '--database-url-env', 'DATABASE_URL', '--out', `src/contracts/${sql}.json`]);
}

for (const [sql, result, params] of items) {
  const args = [
    'check',
    `src/tickets/${sql}`,
    '--contract',
    `src/contracts/${sql}.json`,
    '--params-type-file',
    'src/types.ts',
    '--params-type',
    params,
  ];
  if (result) args.push('--result-type-file', 'src/types.ts', '--result-type', result);
  call(args);
}

execFileSync('git', ['diff', '--exit-code', '--', 'src/contracts'], { cwd: root, stdio: 'inherit' });

const temporary = mkdtempSync(join(tmpdir(), 'fresh-reference-negative-'));
try {
  const types = readFileSync('src/types.ts', 'utf8');
  const badResultTypes = join(temporary, 'bad-result.ts');
  const badParamsTypes = join(temporary, 'bad-params.ts');
  const staleSql = join(temporary, 'stale.sql');

  writeFileSync(badResultTypes, types.replace('id: string;', 'id: number;'));
  writeFileSync(badParamsTypes, types.replace('export type GetParams = { id: string | bigint | null };', 'export type GetParams = { id: number | null };'));
  writeFileSync(staleSql, `${readFileSync('src/tickets/get.sql', 'utf8')}\n-- stale`);

  expectFailure([
    'check', 'src/tickets/get.sql', '--contract', 'src/contracts/get.sql.json',
    '--result-type-file', badResultTypes, '--result-type', 'Ticket',
    '--params-type-file', 'src/types.ts', '--params-type', 'GetParams',
  ], 'bigint result declared as number');
  expectFailure([
    'check', 'src/tickets/get.sql', '--contract', 'src/contracts/get.sql.json',
    '--result-type-file', 'src/types.ts', '--result-type', 'Ticket',
    '--params-type-file', badParamsTypes, '--params-type', 'GetParams',
  ], 'bigint parameter declared as number');
  expectFailure([
    'check', staleSql, '--contract', 'src/contracts/get.sql.json',
    '--result-type-file', 'src/types.ts', '--result-type', 'Ticket',
    '--params-type-file', 'src/types.ts', '--params-type', 'GetParams',
  ], 'stale SQL contract');
} finally {
  rmSync(temporary, { recursive: true, force: true });
}

function expectFailure(args, label) {
  try {
    call(args, 'pipe');
  } catch {
    return;
  }
  throw new Error(`${label} unexpectedly passed.`);
}
