import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = process.cwd();
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required for live PostgreSQL contract verification.');

const cli = resolve(root, '../../packages/cli/dist/index.js');
const generated = 'src/tickets/generated';
const contracts = [
  ['src/tickets/list.sql', 'list.postgres.contract.json', 'Ticket', 'ListTicketsSqlParams'],
  ['src/tickets/get.sql', 'get.postgres.contract.json', 'Ticket', 'TicketIdSqlParams'],
  ['src/tickets/assign-ticket.sql', 'assign-ticket.postgres.contract.json', 'Ticket', 'AssignTicketSqlParams'],
  ['src/tickets/insert-event.sql', 'insert-event.postgres.contract.json', undefined, 'InsertTicketEventSqlParams'],
];

const invoke = (args) => {
  try {
    execFileSync(process.execPath, [cli, 'postgres-contract', ...args], {
      cwd: root,
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: 'pipe',
    });
  } catch (error) {
    process.stderr.write(error.stdout ?? '');
    process.stderr.write(error.stderr ?? '');
    throw error;
  }
};

for (const [sql, contract] of contracts) {
  invoke(['write', sql, '--database-url-env', 'DATABASE_URL', '--out', `${generated}/${contract}`]);
}
for (const [sql, contract, resultType, paramsType] of contracts) {
  const args = ['check', sql, '--contract', `${generated}/${contract}`, '--params-type-file', 'src/tickets/types.ts', '--params-type', paramsType];
  if (resultType) args.push('--result-type-file', 'src/tickets/types.ts', '--result-type', resultType);
  invoke(args);
}

execFileSync('git', ['diff', '--exit-code', '--', generated], { cwd: root, stdio: 'inherit' });

const control = mkdtempSync(join(tmpdir(), 'scope-reference-contract-'));
try {
  const types = readFileSync(resolve(root, 'src/tickets/types.ts'), 'utf8');
  const badResultTypes = types.replace('id: string | null;', 'id: number | null;');
  const badParameterTypes = types.replace('id: string;\n}', 'id: number;\n}');
  const staleSql = `${readFileSync(resolve(root, 'src/tickets/get.sql'), 'utf8')}\n-- stale contract control\n`;
  writeFileSync(join(control, 'bad-result.ts'), badResultTypes);
  writeFileSync(join(control, 'bad-parameter.ts'), badParameterTypes);
  writeFileSync(join(control, 'stale.sql'), staleSql);

  const expectRejected = (args, label) => {
    const result = spawnSync(process.execPath, [cli, 'postgres-contract', 'check', ...args], {
      cwd: root,
      env: { ...process.env, DATABASE_URL: databaseUrl },
      encoding: 'utf8',
    });
    if (result.status === 0) throw new Error(`${label} unexpectedly passed.`);
  };
  const getContract = `${generated}/get.postgres.contract.json`;
  expectRejected(['src/tickets/get.sql', '--contract', getContract, '--result-type-file', join(control, 'bad-result.ts'), '--result-type', 'Ticket', '--params-type-file', 'src/tickets/types.ts', '--params-type', 'TicketIdSqlParams'], 'bigint result declared as number');
  expectRejected(['src/tickets/get.sql', '--contract', getContract, '--result-type-file', 'src/tickets/types.ts', '--result-type', 'Ticket', '--params-type-file', join(control, 'bad-parameter.ts'), '--params-type', 'TicketIdSqlParams'], 'bigint parameter declared as number');
  expectRejected([join(control, 'stale.sql'), '--contract', getContract, '--result-type-file', 'src/tickets/types.ts', '--result-type', 'Ticket', '--params-type-file', 'src/tickets/types.ts', '--params-type', 'TicketIdSqlParams'], 'stale SQL');
} finally {
  rmSync(control, { recursive: true, force: true });
}

process.stdout.write('PostgreSQL-derived contracts verified for list, get, assign-ticket, and insert-event; bigint result/parameter and stale-SQL controls rejected.\n');
