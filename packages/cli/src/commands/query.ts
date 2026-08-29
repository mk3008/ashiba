import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Command } from 'commander';
import { createTwoFilesPatch } from 'diff';
import {
  buildQueryLintReport,
  buildQuerySliceReport,
  buildQueryStructureReport,
  buildQueryUsageReport,
  formatQueryLintReport,
  formatQueryStructureReport,
  formatQueryUsageReport,
} from '../sqlgrep/index.js';
import { invalidCliInputError, requiredCliValueError } from '../errors.js';
import { LexemeCursor, SqlFormatter, SqlParser, type Lexeme } from 'rawsql-ts';
import { loadSqlFormatOptions } from '../sql-format.js';
import { loadProjectPathConfig } from './config.js';
import { normalizeSqlSource } from '../sql-source.js';

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

export interface QueryStructureOptions {
  format?: 'text' | 'json' | 'dot';
}

export interface QuerySliceOptions {
  cte?: string;
  final?: boolean;
  limit?: string;
}

export interface QueryLintOptions {
  format?: 'text' | 'json';
  rootDir?: string;
  rules?: string;
}

export interface QueryFormatOptions {
  format?: 'text' | 'json';
  rootDir?: string;
  write?: boolean;
  check?: boolean;
  diff?: boolean;
  all?: boolean;
}

export interface QueryFormatReport {
  commandName: 'query format';
  file: string;
  changed: boolean;
  written: boolean;
  safe: boolean;
  skipped: boolean;
  tokenCountBefore: number;
  tokenCountAfter: number;
  reason?: string;
  sql: string;
  diff: string;
}

export interface QueryFormatBatchReport {
  commandName: 'query format';
  rootDir: string;
  files: QueryFormatReport[];
  changed: number;
  written: number;
  skipped: number;
  unsafe: number;
}

/**
 * Registers retained SQL inspection and usage-analysis commands.
 */
export function registerQueryCommand(program: Command): void {
  const query = program
    .command('query')
    .description('Impact investigation for SQL assets and QuerySpec-like catalogs')
    .addHelpText('after', `
Use cases:
  uses table/column  Estimate impact before changing schema objects.
  outline/graph      Understand CTE-heavy SQL before editing it.
  slice              Run a smaller CTE debug query in a SQL client.
  format             Format SQL explicitly after safety checks pass.
  lint               Catch hard-to-review query shapes before review.
`);

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
    .option('--allow-parser-fallback', 'Allow explicit regex fallback when AST parsing fails for table usage')
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
    .option('--allow-parser-fallback', 'Allow explicit parser-failure diagnostics instead of failing the command')
    .action((target: string, options: QueryUsesOptions) => {
      process.stdout.write(runQueryUses('column', target, options));
    });

  query
    .command('outline <sqlFile>')
    .description('Summarize query structure, CTE dependencies, and base table usage')
    .option('--format <format>', 'Output format: text or json', 'text')
    .action((sqlFile: string, options: QueryStructureOptions) => {
      process.stdout.write(runQueryStructure(sqlFile, { ...options, format: normalizeStructureFormat(options.format ?? 'text', false) }));
    });

  query
    .command('graph <sqlFile>')
    .description('Emit the query dependency graph in text, JSON, or DOT form')
    .option('--format <format>', 'Output format: text, json, or dot', 'text')
    .action((sqlFile: string, options: QueryStructureOptions) => {
      process.stdout.write(runQueryStructure(sqlFile, { ...options, format: normalizeStructureFormat(options.format ?? 'text', true) }));
    });

  query
    .command('slice <sqlFile>')
    .description('Extract a runnable CTE debug slice to find where a complex WITH query breaks')
    .option('--cte <name>', 'Slice a specific CTE into a standalone debug query')
    .option('--final', 'Slice the final query while removing unused CTEs')
    .option('--limit <count>', 'Add LIMIT to the emitted debug query when supported')
    .action((sqlFile: string, options: QuerySliceOptions) => {
      process.stdout.write(runQuerySlice(sqlFile, options));
    });

  query
    .command('format [sqlFile]')
    .description('Format SQL queries with Ashiba defaults when the rewrite is loss-safe')
    .option('--format <format>', 'Output format: text or json', 'text')
    .option('--root-dir <path>', 'Project root for ashiba.config.json', process.cwd())
    .option('--all', 'Format every .sql file under ashiba.config.json sqlRoots')
    .option('--write', 'Write formatted SQL back to the file when the rewrite is safe')
    .option('--check', 'Fail when formatting would change the file or the rewrite is unsafe')
    .option('--diff', 'Emit a unified diff instead of formatted SQL')
    .action((sqlFile: string | undefined, options: QueryFormatOptions) => {
      const result = options.all
        ? runQueryFormatAll(options)
        : runQueryFormat(requireQueryFormatFile(sqlFile), options);
      if (options.check && queryFormatHasCheckFailure(result)) {
        process.exitCode = 1;
      }
      process.stdout.write(formatQueryFormatReport(result, options.format ?? 'text', Boolean(options.diff)));
    });

  query
    .command('lint <sqlFile>')
    .description('Report structural maintainability and analysis-safety issues in a SQL query')
    .option('--format <format>', 'Output format: text or json', 'text')
    .option('--root-dir <path>', 'Project root for config and DDL-aware rules', process.cwd())
    .option('--rules <list>', 'Comma-separated lint rules to enable, for example: join-direction')
    .action((sqlFile: string, options: QueryLintOptions) => {
      process.stdout.write(runQueryLint(sqlFile, options));
    });

}

/**
 * Builds a formatted structural outline for a visible SQL file.
 */
export function runQueryStructure(sqlFile: string, options: QueryStructureOptions = {}): string {
  const format = normalizeStructureFormat(options.format ?? 'text', true);
  return formatQueryStructureReport(buildQueryStructureReport(sqlFile, 'ashiba query outline'), format);
}

/**
 * Builds a formatted query slice report for a selected CTE or dependency path.
 */
export function runQuerySlice(sqlFile: string, options: QuerySliceOptions): string {
  return buildQuerySliceReport(sqlFile, {
    cte: options.cte,
    final: Boolean(options.final),
    limit: normalizePositiveInteger(options.limit, '--limit'),
  }).sql;
}

/**
 * Runs query lint rules and formats the resulting report.
 */
export function runQueryLint(sqlFile: string, options: QueryLintOptions = {}): string {
  const format = normalizeFormat(options.format ?? 'text');
  const report = buildQueryLintReport(sqlFile, {
    projectRoot: options.rootDir ?? process.cwd(),
    rules: normalizeLintRules(options.rules),
  });
  return formatQueryLintReport(report, format);
}

/**
 * Formats a SQL file only when the AST rewrite can be validated as loss-safe.
 */
export function runQueryFormat(sqlFile: string, options: QueryFormatOptions = {}): QueryFormatReport {
  const absoluteInputPath = path.resolve(sqlFile);
  const originalSql = readFileSync(absoluteInputPath, 'utf8');
  const rootDir = path.resolve(options.rootDir ?? process.cwd());
  const formatter = new SqlFormatter(loadSqlFormatOptions(options.rootDir ?? process.cwd()));
  const originalAst = SqlParser.parse(originalSql);
  const formattedSql = `${formatter.format(originalAst).formattedSql.trimEnd()};\n`;
  const safety = validateFormattedSql(originalSql, formattedSql, formatter);
  const changed = normalizeLineEndings(originalSql) !== normalizeLineEndings(formattedSql);
  const diff = createTwoFilesPatch(
    normalizePath(absoluteInputPath),
    normalizePath(absoluteInputPath),
    normalizeLineEndings(originalSql),
    normalizeLineEndings(formattedSql),
    '',
    '',
    { context: 3 },
  );

  const shouldWrite = Boolean(options.write) && safety.safe && changed;
  if (shouldWrite) {
    mkdirSync(path.dirname(absoluteInputPath), { recursive: true });
    writeFileSync(absoluteInputPath, formattedSql, 'utf8');
  }

  return {
    commandName: 'query format',
    file: absoluteInputPath,
    changed,
    written: shouldWrite,
    safe: safety.safe,
    skipped: Boolean(options.write) && !safety.safe,
    tokenCountBefore: safety.tokenCountBefore,
    tokenCountAfter: safety.tokenCountAfter,
    reason: safety.reason,
    sql: formattedSql,
    diff,
  };
}

/**
 * Formats every configured SQL root in stable order.
 */
export function runQueryFormatAll(options: QueryFormatOptions = {}): QueryFormatBatchReport {
  const rootDir = path.resolve(options.rootDir ?? process.cwd());
  const config = loadProjectPathConfig(rootDir);
  const files = uniqueSorted(config.sqlRoots.flatMap((configuredRoot) => {
    const absoluteRoot = path.join(rootDir, configuredRoot);
    return existsSync(absoluteRoot) ? collectSqlFiles(absoluteRoot) : [];
  }));
  const reports = files.map((file) => runQueryFormat(file, { ...options, rootDir, all: false }));
  return {
    commandName: 'query format',
    rootDir,
    files: reports,
    changed: reports.filter((report) => report.changed).length,
    written: reports.filter((report) => report.written).length,
    skipped: reports.filter((report) => report.skipped).length,
    unsafe: reports.filter((report) => !report.safe).length,
  };
}

/**
 * Finds query usages for a table or column target and formats the report.
 */
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
  if (normalized === 'text' || normalized === 'json') {
    return normalized;
  }
  throw invalidCliInputError(
    'ASHIBA_UNSUPPORTED_OUTPUT_FORMAT',
    `Unsupported format: ${value}`,
    'Use --format text or --format json.',
    { value, supported: ['text', 'json'] },
  );
}

function normalizeStructureFormat(value: string, allowDot: boolean): 'text' | 'json' | 'dot' {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'text' || normalized === 'json') {
    return normalized;
  }
  if (allowDot && normalized === 'dot') {
    return normalized;
  }
  throw invalidCliInputError(
    'ASHIBA_UNSUPPORTED_OUTPUT_FORMAT',
    `Unsupported format: ${value}`,
    allowDot ? 'Use --format text, --format json, or --format dot.' : 'Use --format text or --format json.',
    { value, supported: allowDot ? ['text', 'json', 'dot'] : ['text', 'json'] },
  );
}

function normalizePositiveInteger(value: string | undefined, label: string): number | undefined {
  if (value === undefined || value.trim().length === 0) {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw invalidCliInputError(
      'ASHIBA_POSITIVE_INTEGER_REQUIRED',
      `${label} must be a positive integer.`,
      `Pass ${label} as an integer greater than zero, or omit it to use the default behavior.`,
      { label, value },
    );
  }
  return parsed;
}

function normalizeCommaList(value: string | undefined): string[] | undefined {
  if (!value) {
    return undefined;
  }
  const result = value.split(',').map((item) => item.trim()).filter(Boolean);
  return result.length > 0 ? result : undefined;
}

function normalizeLintRules(value: string | undefined): Array<'join-direction'> | undefined {
  const values = normalizeCommaList(value);
  if (!values) {
    return undefined;
  }
  for (const rule of values) {
    if (rule !== 'join-direction') {
      throw invalidCliInputError(
        'ASHIBA_UNSUPPORTED_QUERY_LINT_RULE',
        `Unsupported lint rule: ${rule}. Supported rules: join-direction`,
        'Use --rules join-direction or omit --rules.',
        { rule, supported: ['join-direction'] },
      );
    }
  }
  return values as Array<'join-direction'>;
}

function validateFormattedSql(
  originalSql: string,
  formattedSql: string,
  formatter: SqlFormatter,
): ({ safe: true; reason?: undefined } | { safe: false; reason: string }) & { tokenCountBefore: number; tokenCountAfter: number } {
  const beforeTokens = tokenizeSqlForSafety(originalSql);
  const afterTokens = tokenizeSqlForSafety(formattedSql);
  const tokenCountBefore = beforeTokens.length;
  const tokenCountAfter = afterTokens.length;
  const missingComments = missingSqlCommentFragments(originalSql, formattedSql);
  if (missingComments.length > 0) {
    return { safe: false, reason: `formatting would drop SQL comments: ${missingComments.join(', ')}`, tokenCountBefore, tokenCountAfter };
  }
  try {
    const originalNormalized = formatter.format(SqlParser.parse(originalSql)).formattedSql.trim();
    const formattedNormalized = formatter.format(SqlParser.parse(formattedSql)).formattedSql.trim();
    if (originalNormalized !== formattedNormalized) {
      return { safe: false, reason: 'formatted SQL does not round-trip to the same normalized AST output', tokenCountBefore, tokenCountAfter };
    }
  } catch (error) {
    return { safe: false, reason: error instanceof Error ? error.message : String(error), tokenCountBefore, tokenCountAfter };
  }
  return { safe: true, tokenCountBefore, tokenCountAfter };
}

function tokenizeSqlForSafety(sql: string): Lexeme[] {
  return LexemeCursor.getAllLexemesWithPosition(sql);
}

function missingSqlCommentFragments(before: string, after: string): string[] {
  const beforeComments = extractSqlCommentFragments(before);
  if (beforeComments.length === 0) {
    return [];
  }
  const normalizedAfter = normalizeLineEndings(after);
  return beforeComments.filter((comment) => !normalizedAfter.includes(comment));
}

function extractSqlCommentFragments(sql: string): string[] {
  const normalized = normalizeLineEndings(sql);
  const lineMatches = normalized.match(/--.*$/gm) ?? [];
  const blockMatches = normalized.match(/\/\*[\s\S]*?\*\//g) ?? [];
  return [...lineMatches, ...blockMatches].map((comment) => comment.trim()).filter(Boolean);
}

function queryFormatHasCheckFailure(report: QueryFormatReport | QueryFormatBatchReport): boolean {
  if ('files' in report) {
    return report.files.some((entry) => !entry.safe || entry.changed);
  }
  return !report.safe || report.changed;
}

function requireQueryFormatFile(sqlFile: string | undefined): string {
  if (sqlFile && sqlFile.trim().length > 0) {
    return sqlFile;
  }
  throw requiredCliValueError('sqlFile or --all');
}

function formatQueryFormatReport(report: QueryFormatReport | QueryFormatBatchReport, formatValue: string, diff: boolean): string {
  const format = normalizeFormat(formatValue);
  if (format === 'json') {
    return `${JSON.stringify(report, null, 2)}\n`;
  }
  if ('files' in report) {
    return formatQueryFormatBatchReport(report);
  }
  if (diff) {
    return report.diff.endsWith('\n') ? report.diff : `${report.diff}\n`;
  }
  if (!report.safe) {
    return [
      'Query format: skipped',
      `File: ${report.file}`,
      `Reason: ${report.reason ?? 'unsafe rewrite'}`,
      '',
    ].join('\n');
  }
  if (report.written) {
    return [
      'Query format: written',
      `File: ${report.file}`,
      `Changed: ${report.changed ? 'yes' : 'no'}`,
      '',
    ].filter((line): line is string => line !== undefined).join('\n');
  }
  return report.sql;
}

function formatQueryFormatBatchReport(report: QueryFormatBatchReport): string {
  const lines = [
    'Query format: completed',
    `Root: ${report.rootDir}`,
    `Files: ${report.files.length}`,
    `Changed: ${report.changed}`,
    `Written: ${report.written}`,
    `Skipped: ${report.skipped}`,
    `Unsafe: ${report.unsafe}`,
  ];
  for (const entry of report.files) {
    const status = !entry.safe ? 'skipped unsafe' : entry.written ? 'written' : entry.changed ? 'changed' : 'ok';
    lines.push(`- ${status}: ${entry.file}`);
    if (!entry.safe && entry.reason) {
      lines.push(`  reason: ${entry.reason}`);
    }
  }
  lines.push('');
  return lines.join('\n');
}

function collectSqlFiles(rootDir: string): string[] {
  const files: string[] = [];
  const entries = readdirSync(rootDir, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name));
  for (const entry of entries) {
    const absolute = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') {
        continue;
      }
      files.push(...collectSqlFiles(absolute));
    } else if (entry.isFile() && entry.name.endsWith('.sql')) {
      files.push(absolute);
    }
  }
  return files;
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => normalizePath(left).localeCompare(normalizePath(right)));
}

function normalizeLineEndings(value: string): string {
  return value.replace(/\r\n/g, '\n');
}

function normalizePath(value: string): string {
  return value.split(path.sep).join('/');
}

function normalizeView(value: string): 'impact' | 'detail' {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'impact' || normalized === 'detail') {
    return normalized;
  }
  throw invalidCliInputError(
    'ASHIBA_UNSUPPORTED_QUERY_VIEW',
    `Unsupported view: ${value}`,
    'Use --view impact or --view detail.',
    { value, supported: ['impact', 'detail'] },
  );
}
