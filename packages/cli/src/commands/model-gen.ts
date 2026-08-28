import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Command } from 'commander';
import { compileNamedParameters } from '@ashiba-ts/named-parameters/compiler';
import { ColumnReference, SimpleSelectQuery, SqlParser, TableSource, UpdateQuery } from 'rawsql-ts';
import { normalizeSqlSource } from '../sql-source.js';
import { extractSqlResultColumnAstItems, extractSqlResultColumnContracts } from './sql-result-columns.js';
import { buildSqlSafeSortMetadata } from './sql-safe-sort-metadata.js';
import { buildSqlOptionalConditionCompressionMetadata } from './sql-optional-condition-compression-metadata.js';
import { loadDdlSchemaModel, type DdlSchemaTable } from './ddl-schema-model.js';
import { loadProjectPathConfig } from './config.js';
import { inferSqlExpressionNullability } from './sql-expression-type.js';
import { normalizeIdentifier, resolveSchemaPathTable } from './schema-path.js';

export interface ModelGenOptions {
  sqlFile?: string;
  out?: string;
  rootDir?: string;
  dryRun?: boolean;
  check?: boolean;
  format?: 'text' | 'json';
}

export interface ModelGenResult {
  sqlFile: string;
  sourceHash: string;
  bindings: {
    postgres: { style: 'indexed'; sql: string; parameterNames: readonly string[] };
    mysql2: { style: 'anonymous'; sql: string; valueNames: readonly string[] };
    mssql: { style: 'named'; sql: string; parameterNames: readonly string[] };
  };
  out?: string;
  contents: string;
  dryRun: boolean;
  fresh?: boolean;
}

export function buildQueryResultColumnContracts(sql: string, rootDir?: string, ddlDir?: string): ReturnType<typeof extractSqlResultColumnContracts> {
  try {
    const columns = extractSqlResultColumnContracts(sql);
    if (!rootDir) return columns;
    const table = resolveDirectResultTable(sql, path.resolve(rootDir), ddlDir);
    if (!table) return columns;
    const valuesByName = new Map(extractSqlResultColumnAstItems(sql).map((item) => [item.name, item.value]));
    return columns.map((column) => {
      const value = valuesByName.get(column.name);
      if (!value) return column;
      const nullability = inferSqlExpressionNullability(value, {
        resolveColumnNullability: (reference) => directColumnNullability(reference, table),
      });
      return nullability === 'unknown' ? column : { ...column, nullability };
    });
  } catch {
    return [];
  }
}

/**
 * The remaining core only needs a direct-table DDL nullability hint for the
 * standalone contract. Complex feature-layout/CTE inference belonged to the
 * removed scaffold surface and deliberately degrades to unknown here.
 */
function resolveDirectResultTable(sql: string, rootDir: string, ddlDir?: string): { table: DdlSchemaTable; alias?: string } | undefined {
  const model = loadDdlSchemaModel(rootDir, ddlDir);
  if (!model) return undefined;
  const parsed = SqlParser.parse(sql);
  const source = parsed instanceof SimpleSelectQuery
    ? parsed.fromClause?.source
    : parsed instanceof UpdateQuery
      ? parsed.updateClause.source
      : undefined;
  if (!source || !(source.datasource instanceof TableSource)) return undefined;
  const config = loadProjectPathConfig(rootDir);
  const table = resolveSchemaPathTable(model, source.datasource.qualifiedName.toString(), config);
  if (!table) return undefined;
  return { table, alias: source.getAliasName() ? normalizeIdentifier(source.getAliasName() ?? '') : undefined };
}

function directColumnNullability(reference: ColumnReference, relation: { table: DdlSchemaTable; alias?: string }): boolean | undefined {
  const namespaces = reference.namespaces?.map((namespace) => normalizeIdentifier(namespace.name).toLowerCase()) ?? [];
  const qualifier = namespaces.at(-1);
  if (qualifier && qualifier !== relation.alias?.toLowerCase() && qualifier !== relation.table.name.toLowerCase()) return undefined;
  return relation.table.columns.get(normalizeIdentifier(reference.column.name).toLowerCase())?.nullable;
}

export function analyzeQueryModel(
  sql: string,
  namedParameters: readonly string[],
  resultColumns: ReturnType<typeof extractSqlResultColumnContracts>,
  _options: { optionalConditionCompression?: boolean; parameterTypes?: Record<string, string> } = {},
) {
  return {
    sourceHash: `sha256:${createHash('sha256').update(normalizeSqlSource(sql)).digest('hex')}`,
    resultColumnOrder: resultColumns.map((column) => column.name),
    resultColumnNullability: Object.fromEntries(resultColumns.map((column) => [column.name, column.nullability])),
    namedParameters: [...namedParameters],
    parserCapabilities: { parser: { status: 'unaffected' }, parameterBinding: 'unaffected' },
    safeSort: buildSqlSafeSortMetadata(sql),
    optionalConditionCompression: _options.optionalConditionCompression ? buildSqlOptionalConditionCompressionMetadata(sql) : undefined,
  };
}

export function buildPostgresSafeSortBindingMetadata(sql = '', safeSort: ReturnType<typeof buildSqlSafeSortMetadata>): { safeSortInsertion?: { index: number; end?: number } } {
  if (safeSort.insertion.status !== 'ready') return {};
  const at = (index: number) => compileNamedParameters(sql.slice(0, index), { rendering: { style: 'indexed', prefix: '$' } }).sql.length;
  return { safeSortInsertion: { index: at(safeSort.insertion.index), ...(safeSort.insertion.end === undefined ? {} : { end: at(safeSort.insertion.end) }) } };
}

export function buildPostgresOptionalConditionCompressionBindingMetadata(sql = '', metadata: ReturnType<typeof buildSqlOptionalConditionCompressionMetadata> | undefined) {
  if (!metadata) return {};
  const at = (index: number) => compileNamedParameters(sql.slice(0, index), { rendering: { style: 'indexed', prefix: '$' } }).sql.length;
  const text = (start: number, value: string) => {
    const prefix = compileNamedParameters(sql.slice(0, start), { rendering: { style: 'indexed', prefix: '$' } }).sql;
    return compileNamedParameters(`${sql.slice(0, start)}${value}`, { rendering: { style: 'indexed', prefix: '$' } }).sql.slice(prefix.length);
  };
  return { optionalConditionCompression: {
    branches: metadata.branches.map((branch) => ({ parameterName: branch.parameterName, removalRange: { start: at(branch.removalRange.start), end: at(branch.removalRange.end) }, presentReplacement: { start: at(branch.presentReplacement.start), end: at(branch.presentReplacement.end), text: text(branch.presentReplacement.start, branch.presentReplacement.text) } })),
  } };
}

/** Generate deterministic, driver-specific binding metadata from canonical SQL. */
export function registerModelGenCommand(program: Command): void {
  program
    .command('model-gen')
    .description('Generate deterministic named-parameter binding metadata from visible SQL')
    .argument('<sqlFile>', 'Canonical SQL file to lower')
    .option('--out <file>', 'Write binding metadata to this TypeScript file')
    .option('--root-dir <path>', 'Project root directory', '.')
    .option('--dry-run', 'Print metadata without writing it', false)
    .option('--check', 'Fail when --out is missing or differs from regenerated binding metadata', false)
    .option('--format <format>', 'Output format: text or json', 'text')
    .action((sqlFile: string, options: Omit<ModelGenOptions, 'sqlFile'>) => {
      const result = runModelGen({ ...options, sqlFile });
      if (options.check === true && result.fresh !== true) process.exitCode = 1;
      process.stdout.write(options.format === 'json'
        ? `${JSON.stringify(result, null, 2)}\n`
        : result.out && !result.dryRun
          ? `Generated binding metadata: ${result.out}\n`
          : result.contents);
    });
}

export function runModelGen(options: ModelGenOptions): ModelGenResult {
  const rootDir = path.resolve(options.rootDir ?? '.');
  if (!options.sqlFile) throw new Error('A canonical SQL file is required.');
  const sqlPath = path.resolve(rootDir, options.sqlFile);
  const sql = normalizeSqlSource(readFileSync(sqlPath, 'utf8'));
  const sourceHash = `sha256:${createHash('sha256').update(sql).digest('hex')}`;
  const postgres = compileNamedParameters(sql, { rendering: { style: 'indexed', prefix: '$' } });
  const mysql2 = compileNamedParameters(sql, { rendering: { style: 'anonymous', token: '?' } });
  const mssql = compileNamedParameters(sql, { rendering: { style: 'named', prefix: '@' } });
  const bindings = {
    postgres: { ...postgres, parameterNames: [...postgres.parameterNames] },
    mysql2: { ...mysql2, valueNames: [...mysql2.valueNames] },
    mssql: { ...mssql, parameterNames: [...mssql.parameterNames] },
  };
  const contents = [
    '// Generated by Ashiba model-gen. Do not edit by hand.',
    '// Regenerate from the canonical SQL whenever it changes.',
    '',
    `export const bindingMetadata = ${JSON.stringify({ sourceHash, bindings }, null, 2)} as const;`,
    '',
  ].join('\n');
  const out = options.out ? path.resolve(rootDir, options.out) : undefined;
  if (options.check === true && !out) throw new Error('--check requires --out so freshness has a deterministic target.');
  const fresh = out ? existsSync(out) && readFileSync(out, 'utf8') === contents : undefined;
  if (options.check === true) {
    const checkOut = out!;
    return {
      sqlFile: path.relative(rootDir, sqlPath).replace(/\\/g, '/'), sourceHash, bindings, contents,
      out: path.relative(rootDir, checkOut).replace(/\\/g, '/'), dryRun: true, fresh,
    };
  }
  if (out && options.dryRun !== true) {
    mkdirSync(path.dirname(out), { recursive: true });
    writeFileSync(out, contents, 'utf8');
  }
  return {
    sqlFile: path.relative(rootDir, sqlPath).replace(/\\/g, '/'),
    sourceHash,
    bindings,
    contents,
    out: out ? path.relative(rootDir, out).replace(/\\/g, '/') : undefined,
    dryRun: options.dryRun === true,
    fresh,
  };
}
