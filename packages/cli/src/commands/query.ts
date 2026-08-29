import type { Command } from 'commander';
import {
  buildQueryUsageReport,
  formatQueryUsageReport,
} from '../sqlgrep/index.js';
import { invalidCliInputError } from '../errors.js';

export interface QueryUsesOptions {
  format?: 'text' | 'json';
  view?: 'impact' | 'detail';
  rootDir?: string;
  scopeDir?: string;
  sqlRoot?: string;
  excludeGenerated?: boolean;
  anySchema?: boolean;
  anyTable?: boolean;
  allowParserFallback?: boolean;
}

/** Registers AST-first, repository-wide SQL usage inspection commands. */
export function registerQueryCommand(program: Command): void {
  const query = program
    .command('query')
    .description('AST-first repository-wide impact inspection for SQL assets');
  const uses = query.command('uses').description('Find where SQL assets use a table or column target');

  uses
    .command('table <target>')
    .description('Find statements that use a table target')
    .option('--format <format>', 'Output format: text or json', 'text')
    .option('--view <view>', 'Investigation view: impact or detail', 'impact')
    .option('--root-dir <path>', 'Project root to scan', process.cwd())
    .option('--scope-dir <path>', 'Limit discovery to one QuerySpec subtree')
    .option('--sql-root <path>', 'Fallback root for shared sqlFile layouts')
    .option('--exclude-generated', 'Exclude QuerySpec files under generated directories')
    .option('--any-schema', 'Allow <table> lookup across schemas')
    .option('--allow-parser-fallback', 'Explicitly allow low-confidence regex fallback when AST parsing fails')
    .action((target: string, options: QueryUsesOptions) => {
      process.stdout.write(runQueryUses('table', target, options));
    });

  uses
    .command('column <target>')
    .description('Find statements that use a column target')
    .option('--format <format>', 'Output format: text or json', 'text')
    .option('--view <view>', 'Investigation view: impact or detail', 'impact')
    .option('--root-dir <path>', 'Project root to scan', process.cwd())
    .option('--scope-dir <path>', 'Limit discovery to one QuerySpec subtree')
    .option('--sql-root <path>', 'Fallback root for shared sqlFile layouts')
    .option('--exclude-generated', 'Exclude QuerySpec files under generated directories')
    .option('--any-schema', 'Allow <table.column> or <column> lookup across schemas')
    .option('--any-table', 'Allow <column> lookup across tables; requires --any-schema')
    .option('--allow-parser-fallback', 'Explicitly allow parser-failure diagnostics instead of failing the command')
    .action((target: string, options: QueryUsesOptions) => {
      process.stdout.write(runQueryUses('column', target, options));
    });
}

/** Finds query usages for a table or column target and formats the report. */
export function runQueryUses(kind: 'table' | 'column', target: string, options: QueryUsesOptions): string {
  const format = normalizeFormat(options.format ?? 'text');
  const view = normalizeView(options.view ?? 'impact');
  const report = buildQueryUsageReport({
    kind,
    rawTarget: target,
    rootDir: options.rootDir ?? process.cwd(),
    specsDir: options.scopeDir,
    sqlRoot: options.sqlRoot,
    excludeGenerated: Boolean(options.excludeGenerated),
    anySchema: Boolean(options.anySchema),
    anyTable: Boolean(options.anyTable),
    view,
    allowParserFallback: Boolean(options.allowParserFallback),
  });
  return formatQueryUsageReport(report, format);
}

function normalizeFormat(value: string): 'text' | 'json' {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'text' || normalized === 'json') return normalized;
  throw invalidCliInputError(
    'ASHIBA_UNSUPPORTED_OUTPUT_FORMAT',
    `Unsupported format: ${value}`,
    'Use --format text or --format json.',
    { value, supported: ['text', 'json'] },
  );
}

function normalizeView(value: string): 'impact' | 'detail' {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'impact' || normalized === 'detail') return normalized;
  throw invalidCliInputError(
    'ASHIBA_UNSUPPORTED_QUERY_VIEW',
    `Unsupported view: ${value}`,
    'Use --view impact or --view detail.',
    { value, supported: ['impact', 'detail'] },
  );
}
