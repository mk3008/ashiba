import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import type { Command } from 'commander';
import { loadProjectPathConfig } from './config.js';
import { compileNamedParameters } from '@ashiba-ts/named-parameters/compiler';
import { readFileSync } from 'node:fs';

export interface ProjectCheckOptions { rootDir?: string; format?: 'text' | 'json'; warningsAsErrors?: boolean; }
export interface ProjectCheckResult {
  kind: 'project-check'; ok: boolean; rootDir: string; durationMs: number;
  coverage: { sqlFiles: number; lintFiles: number };
  checks: { config: { sqlRoots: string[] } };
  errors: Array<{ code: string; message: string; file?: string }>;
  warnings: Array<{ code: string; message: string; file?: string }>;
}

export function registerProjectCommand(program: Command): void {
  program.command('project').description('Run project-level SQL safety checks')
    .command('check').option('--root-dir <path>', 'Project root directory', '.')
    .option('--format <format>', 'Output format: text or json', 'text')
    .option('--warnings-as-errors', 'Treat warnings as check failures', false)
    .action((options: ProjectCheckOptions) => {
      const result = runProjectCheck(options);
      process.stdout.write(options.format === 'json' ? `${JSON.stringify(result, null, 2)}\n` : formatProjectCheckResult(result));
      if (!result.ok) process.exitCode = 1;
    });
}

export function runProjectCheck(options: ProjectCheckOptions = {}): ProjectCheckResult {
  const started = performance.now(); const rootDir = path.resolve(options.rootDir ?? '.');
  const config = loadProjectPathConfig(rootDir);
  const errors: ProjectCheckResult['errors'] = [];
  const sqlFiles = config.sqlRoots.flatMap((sqlRoot) => collectSqlFiles(path.resolve(rootDir, sqlRoot)));
  for (const file of sqlFiles) {
    try {
      compileNamedParameters(readFileSync(file, 'utf8'), { rendering: { style: 'indexed', prefix: '$' } });
    } catch (error) {
      errors.push({ code: 'ASHIBA_SQL_BINDING_COMPILE_FAILED', message: error instanceof Error ? error.message : String(error), file: path.relative(rootDir, file).replace(/\\/g, '/') });
    }
  }
  return { kind: 'project-check', ok: errors.length === 0, rootDir, durationMs: Math.round((performance.now() - started) * 10) / 10,
    coverage: { sqlFiles: sqlFiles.length, lintFiles: 0 }, checks: { config: { sqlRoots: config.sqlRoots } }, errors, warnings: [] };
}

function collectSqlFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const candidate = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectSqlFiles(candidate);
    return entry.isFile() && entry.name.endsWith('.sql') ? [candidate] : [];
  });
}

export function formatProjectCheckResult(result: ProjectCheckResult): string {
  return [`Ashiba project check: ${result.ok ? 'ok' : 'failed'}`, `- root: ${result.rootDir}`, `- duration ms: ${result.durationMs}`,
    `- SQL roots: ${result.checks.config.sqlRoots.join(', ')}`, `- coverage: sqlFiles=${result.coverage.sqlFiles}, lintFiles=${result.coverage.lintFiles}`,
    `- errors: ${result.errors.length}`,
    ...result.errors.map((issue) => `- [error] ${issue.code}: ${issue.message}${issue.file ? ` (${issue.file})` : ''}`), ''].join('\n');
}
