import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Command } from 'commander';
import { compareDdlSql } from '../ddl-diff/index.js';
import { requiredCliValueError } from '../errors.js';

export interface DdlMigrationGenerateOptions {
  from?: string;
  to?: string;
  out?: string;
  format?: 'text' | 'json';
  dryRun?: boolean;
}

export function registerDdlCommand(program: Command): void {
  const ddl = program.command('ddl').description('DDL review and migration helpers');

  const migration = ddl
    .command('migration')
    .description('Generate migration SQL and review migration risk from explicit DDL inputs')
    .addHelpText('after', `
Use case:
  Use this before database deployment to compare an old DDL snapshot and a new
  DDL snapshot. The command writes reviewable migration SQL and reports risks;
  it does not connect to or mutate a database.
`);

  migration
    .command('generate')
    .description('Compare two DDL snapshots, generate reviewable migration SQL, and include risk info')
    .addHelpText('after', `
Use case:
  Use this when a DDL file changed and you need migration SQL plus risk evidence
  for review. Risk reporting is part of this command's output.
`)
    .requiredOption('--from <path>', 'Current or old DDL snapshot')
    .requiredOption('--to <path>', 'Desired or new DDL snapshot')
    .option('--out <path>', 'Write generated migration SQL to this file')
    .option('--dry-run', 'Preview generated migration SQL without writing --out', false)
    .option('--format <format>', 'Output format: text or json', 'text')
    .action((options: DdlMigrationGenerateOptions) => {
      const result = runDdlMigrationGenerate(options);
      process.stdout.write(result);
    });
}

export function runDdlMigrationGenerate(
  options: DdlMigrationGenerateOptions,
  renderOptions: { commandKind?: string; title?: string } = {}
): string {
  const fromPath = requirePath(options.from, '--from');
  const toPath = requirePath(options.to, '--to');
  const remoteSql = readFileSync(fromPath, 'utf8');
  const localSql = readFileSync(toPath, 'utf8');
  const result = compareDdlSql({ localSql, remoteSql });
  const commandKind = renderOptions.commandKind ?? 'ddl-migration-generate';
  const title = renderOptions.title ?? 'DDL migration generate';

  if (options.out && options.dryRun !== true) {
    writeFileSync(options.out, result.sql, 'utf8');
  }

  if (options.format === 'json') {
    return `${JSON.stringify({
      kind: commandKind,
      from: fromPath,
      to: toPath,
      out: options.out ? path.normalize(options.out) : undefined,
      dryRun: options.dryRun === true,
      hasChanges: result.hasChanges,
      summary: result.summary,
      applyPlan: result.applyPlan,
      risks: result.risks,
    }, null, 2)}\n`;
  }

  const lines = [title, `- from: ${fromPath}`, `- to: ${toPath}`];
  if (options.out) {
    lines.push(`- sql: ${path.normalize(options.out)}${options.dryRun === true ? ' (dry-run, not written)' : ''}`);
  }
  if (options.dryRun === true) {
    lines.push('- dry-run: true');
  }
  lines.push('', result.text.trimEnd());
  return `${lines.join('\n')}\n`;
}

function requirePath(value: string | undefined, label: string): string {
  if (!value || value.trim().length === 0) {
    throw requiredCliValueError(label);
  }
  return path.normalize(value);
}
