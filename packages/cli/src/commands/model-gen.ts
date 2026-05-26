import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import type { Command } from 'commander';
import { compileNamedParameters } from '../parameter-metadata.js';
import { BinarySelectQuery, ColumnReference, DeleteQuery, InsertQuery, SimpleSelectQuery, SqlParser, TableSource, UpdateQuery, ValuesQuery, type SourceExpression } from 'rawsql-ts';
import { loadDdlSchemaModel, type DdlSchemaModel, type DdlSchemaTable } from './ddl-schema-model.js';
import { extractSqlResultColumnAstItems, extractSqlResultColumnContracts, type SqlResultColumnContract } from './sql-result-columns.js';
import { buildSqlSafeSortMetadata, type SqlSafeSortMetadata } from './sql-safe-sort-metadata.js';
import {
  buildSqlOptionalConditionCompressionMetadata,
  type SqlOptionalConditionCompressionMetadata,
} from './sql-optional-condition-compression-metadata.js';
import { inferSqlExpressionContractType } from './sql-expression-type.js';
import { requiredCliValueError } from '../errors.js';

export interface ModelGenOptions {
  sqlFile?: string;
  out?: string;
  id?: string;
  rootDir?: string;
  ddlDir?: string;
  dryRun?: boolean;
  format?: 'text' | 'json';
  sssqlCompression?: boolean;
}

export interface ModelGenResult {
  id: string;
  sqlFile: string;
  parameters: string[];
  resultColumns: string[];
  analysis: QueryModelAnalysis;
  bindings: QueryModelBindings;
  contents: string;
  out?: string;
  dryRun: boolean;
}

export type QueryModelStatementKind = 'select' | 'insert' | 'update' | 'delete' | 'unknown';
export type QueryModelRootQueryShape = 'simple-select' | 'compound-select' | 'values' | 'non-select' | 'unknown';

export interface QueryModelAnalysis {
  astParse: 'ok' | 'failed';
  statementKind: QueryModelStatementKind;
  rootQueryShape: QueryModelRootQueryShape;
  hasTopLevelOrderBy: boolean;
  sourceHash: string;
  safeSort: SqlSafeSortMetadata;
  sssqlCompression?: SqlOptionalConditionCompressionMetadata;
  resultColumns: string[];
  resultColumnTypes: Record<string, SqlResultColumnContract['type']>;
  namedParameters: string[];
  error?: string;
}

export interface QueryModelBindings {
  postgres: {
    sourceHash: string;
    sql: string;
    orderedNames: string[];
    safeSortInsertion?: {
      index: number;
    };
    sssqlCompression?: {
      branches: Array<{
        parameterName: string;
        removalRange: {
          start: number;
          end: number;
          text?: string;
        };
      }>;
    };
  };
}

export function registerModelGenCommand(program: Command): void {
  program
    .command('model-gen')
    .description('Generate editable TypeScript query contracts from visible SQL')
    .argument('<sqlFile>', 'SQL file to inspect')
    .option('--out <file>', 'Write the generated TypeScript scaffold to this file')
    .option('--id <id>', 'Override the query id')
    .option('--root-dir <path>', 'Project root directory', '.')
    .option('--ddl-dir <path>', 'Optional DDL directory for static row type hints')
    .option('--sssql-compression', 'Generate optional condition compression metadata', false)
    .option('--dry-run', 'Print the generated scaffold without writing it', false)
    .option('--format <format>', 'Output format: text or json', 'text')
    .action((sqlFile: string, options: Omit<ModelGenOptions, 'sqlFile'>) => {
      const result = runModelGen({ ...options, sqlFile });
      if (options.format === 'json') {
        process.stdout.write(`${JSON.stringify({
          kind: 'model-gen',
          id: result.id,
          sqlFile: result.sqlFile,
          parameters: result.parameters,
          resultColumns: result.resultColumns,
          analysis: result.analysis,
          out: result.out,
          dryRun: result.dryRun,
        }, null, 2)}\n`);
        return;
      }
      process.stdout.write(result.out && !result.dryRun
        ? `Generated query contract: ${result.out}\n`
        : result.contents);
    });
}

export function runModelGen(options: ModelGenOptions): ModelGenResult {
  const rootDir = path.resolve(options.rootDir ?? '.');
  const sqlPath = path.resolve(rootDir, requireValue(options.sqlFile, '<sqlFile>'));
  const sql = readFileSync(sqlPath, 'utf8');
  const postgresBinding = compileNamedParameters(sql, { placeholderStyle: 'postgres' });
  const parameters = [...new Set(postgresBinding.orderedNames)];
  const resultColumnContracts = buildQueryResultColumnContracts(sql, rootDir, options.ddlDir);
  const resultColumns = resultColumnContracts.map((column) => column.name);
  const analysis = analyzeQueryModel(sql, parameters, resultColumnContracts, {
    sssqlCompression: options.sssqlCompression === true,
  });
  const bindings = {
    postgres: {
      sourceHash: analysis.sourceHash,
      sql: postgresBinding.sql,
      orderedNames: postgresBinding.orderedNames,
      ...buildPostgresSafeSortBindingMetadata(sql, analysis.safeSort),
      ...buildPostgresOptionalConditionCompressionBindingMetadata(sql, analysis.sssqlCompression),
    },
  };
  const id = options.id ?? deriveQueryId(rootDir, sqlPath);
  const relativeSqlFile = normalizePath(path.relative(options.out ? path.dirname(path.resolve(rootDir, options.out)) : rootDir, sqlPath));
  const contents = renderQueryContract({ id, sqlFile: relativeSqlFile, parameters, resultColumnContracts, analysis, bindings });
  const out = options.out ? path.resolve(rootDir, options.out) : undefined;

  if (out && options.dryRun !== true) {
    mkdirSync(path.dirname(out), { recursive: true });
    writeFileSync(out, contents, 'utf8');
  }

  return {
    id,
    sqlFile: normalizePath(path.relative(rootDir, sqlPath)),
    parameters,
    resultColumns,
    analysis,
    bindings,
    contents,
    out: out ? normalizePath(path.relative(rootDir, out)) : undefined,
    dryRun: options.dryRun === true,
  };
}

function renderQueryContract(params: {
  id: string;
  sqlFile: string;
  parameters: string[];
  resultColumnContracts: SqlResultColumnContract[];
  analysis: QueryModelAnalysis;
  bindings: QueryModelBindings;
}): string {
  const pascal = toPascal(params.id);
  return [
    '// Generated by Ashiba model-gen. Edit this file when the application contract needs to change.',
    '// Keep the SQL file visible and directly runnable in a SQL client.',
    '',
    `export const queryId = ${JSON.stringify(params.id)};`,
    `export const sqlFile = ${JSON.stringify(params.sqlFile)};`,
    '',
    `export interface ${pascal}QueryParams ${renderParamsInterface(params.parameters)}`,
    '',
    `export interface ${pascal}QueryRow ${renderRowInterface(params.resultColumnContracts)}`,
    '',
    'export const queryModel = {',
    '  queryId,',
    '  sqlFile,',
    `  analysis: ${JSON.stringify(params.analysis, null, 2).replace(/\n/g, '\n  ')},`,
    `  bindings: ${JSON.stringify(params.bindings, null, 2).replace(/\n/g, '\n  ')},`,
    '} as const;',
    '',
    'export const querySpec = {',
    '  id: queryId,',
    '  sqlFile,',
    `  parameters: ${JSON.stringify(params.parameters, null, 2).replace(/\n/g, '\n  ')},`,
    '  analysis: queryModel.analysis,',
    '} as const;',
    '',
  ].join('\n');
}

function buildPostgresSafeSortBindingMetadata(
  sourceSql: string,
  safeSort: SqlSafeSortMetadata,
): { safeSortInsertion?: { index: number } } {
  if (safeSort.insertion.status !== 'ready') {
    return {};
  }
  const compiledPrefix = compileNamedParameters(sourceSql.slice(0, safeSort.insertion.index), {
    placeholderStyle: 'postgres',
  });
  return {
    safeSortInsertion: {
      index: compiledPrefix.sql.length,
    },
  };
}

/**
 * Builds Postgres compiled removal ranges for CLI-generated optional condition compression metadata.
 */
export function buildPostgresOptionalConditionCompressionBindingMetadata(
  sourceSql: string,
  metadata: SqlOptionalConditionCompressionMetadata | undefined,
): { sssqlCompression?: NonNullable<QueryModelBindings['postgres']['sssqlCompression']> } {
  if (!metadata) {
    return {};
  }

  return {
    sssqlCompression: {
      branches: metadata.branches.map((branch) => ({
        parameterName: branch.parameterName,
        removalRange: {
          start: compileNamedParameters(sourceSql.slice(0, branch.removalRange.start), {
            placeholderStyle: 'postgres',
          }).sql.length,
          end: compileNamedParameters(sourceSql.slice(0, branch.removalRange.end), {
            placeholderStyle: 'postgres',
          }).sql.length,
          text: compileNamedParameters(branch.removalRange.text ?? sourceSql.slice(branch.removalRange.start, branch.removalRange.end), {
            placeholderStyle: 'postgres',
          }).sql,
        },
      })),
    },
  };
}

export function buildQueryResultColumnContracts(sql: string, rootDir?: string, ddlDir?: string): SqlResultColumnContract[] {
  const ddlModel = rootDir ? loadDdlSchemaModel(path.resolve(rootDir), ddlDir) : undefined;
  return applyDdlTypeHints(sql, extractSqlResultColumnContracts(sql), ddlModel);
}

export function analyzeQueryModel(
  sql: string,
  namedParameters: string[],
  resultColumnContracts: SqlResultColumnContract[],
  options: { sssqlCompression?: boolean } = {},
): QueryModelAnalysis {
  const sourceHash = hashSql(sql);
  const resultColumns = resultColumnContracts.map((column) => column.name);
  const resultColumnTypes = Object.fromEntries(resultColumnContracts.map((column) => [column.name, column.type]));
  try {
    const parsed = SqlParser.parse(sql);
    return {
      astParse: 'ok',
      statementKind: detectStatementKind(parsed),
      rootQueryShape: detectRootQueryShape(parsed),
      hasTopLevelOrderBy: hasTopLevelOrderBy(parsed),
      sourceHash,
      safeSort: buildSqlSafeSortMetadata(sql),
      ...(options.sssqlCompression
        ? { sssqlCompression: buildSqlOptionalConditionCompressionMetadata(sql) }
        : {}),
      resultColumns,
      resultColumnTypes,
      namedParameters,
    };
  } catch (error) {
    return {
      astParse: 'failed',
      statementKind: 'unknown',
      rootQueryShape: 'unknown',
      hasTopLevelOrderBy: false,
      sourceHash,
      safeSort: {
        insertion: {
          status: 'unresolved',
          reason: 'SQL AST parse failed during model generation.',
        },
        sortable: {},
      },
      ...(options.sssqlCompression
        ? { sssqlCompression: { enabled: true as const, branches: [] } }
        : {}),
      resultColumns,
      resultColumnTypes,
      namedParameters,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function detectStatementKind(parsed: ReturnType<typeof SqlParser.parse>): QueryModelStatementKind {
  if (parsed instanceof InsertQuery) {
    return 'insert';
  }
  if (parsed instanceof UpdateQuery) {
    return 'update';
  }
  if (parsed instanceof DeleteQuery) {
    return 'delete';
  }
  if (parsed instanceof SimpleSelectQuery || parsed instanceof BinarySelectQuery || parsed instanceof ValuesQuery) {
    return 'select';
  }
  return 'unknown';
}

function detectRootQueryShape(parsed: ReturnType<typeof SqlParser.parse>): QueryModelRootQueryShape {
  if (parsed instanceof SimpleSelectQuery) {
    return 'simple-select';
  }
  if (parsed instanceof BinarySelectQuery) {
    return 'compound-select';
  }
  if (parsed instanceof ValuesQuery) {
    return 'values';
  }
  if (parsed instanceof InsertQuery || parsed instanceof UpdateQuery || parsed instanceof DeleteQuery) {
    return 'non-select';
  }
  return 'unknown';
}

function applyDdlTypeHints(
  sql: string,
  columns: SqlResultColumnContract[],
  ddlModel: DdlSchemaModel | undefined,
): SqlResultColumnContract[] {
  if (!ddlModel || columns.length === 0) return columns;
  const relations = extractTopLevelRelations(sql, ddlModel);
  if (relations.length === 0) return columns;
  const astItemsByName = new Map(extractSqlResultColumnAstItems(sql).map((item) => [item.name, item.value]));

  return columns.map((column) => {
    if (column.type !== 'unknown' || !column.expression) return column;
    const astItem = astItemsByName.get(column.name);
    if (!astItem) return column;
    const type = inferSqlExpressionContractType(astItem, {
      resolveColumnType: (reference) => resolveDdlColumnType(reference, relations),
    });
    return type === 'unknown' ? column : { ...column, type };
  });
}

function extractTopLevelRelations(sql: string, ddlModel: DdlSchemaModel): Array<{ alias?: string; table: DdlSchemaTable }> {
  const relations: Array<{ alias?: string; table: DdlSchemaTable }> = [];
  const addRelation = (rawName: string, rawAlias?: string | null) => {
    const alias = normalizeIdentifier(rawAlias ?? '');
    const table = resolveDdlTable(rawName, ddlModel);
    if (table) {
      relations.push({ ...(alias ? { alias } : {}), table });
    }
  };

  const addSource = (source: SourceExpression | null | undefined) => {
    if (!source || !(source.datasource instanceof TableSource)) return;
    addRelation(source.datasource.qualifiedName.toString(), source.getAliasName());
  };

  const addSelectRelations = (query: unknown) => {
    if (query instanceof SimpleSelectQuery) {
      for (const source of query.fromClause?.getSources() ?? []) {
        addSource(source);
      }
      return;
    }
    if (query instanceof BinarySelectQuery) {
      addSelectRelations(query.left);
      addSelectRelations(query.right);
    }
  };

  const parsed = SqlParser.parse(sql);
  if (parsed instanceof SimpleSelectQuery || parsed instanceof BinarySelectQuery) {
    addSelectRelations(parsed);
  } else if (parsed instanceof InsertQuery) {
    addSource(parsed.insertClause.source);
  } else if (parsed instanceof UpdateQuery) {
    addSource(parsed.updateClause.source);
    for (const source of parsed.fromClause?.getSources() ?? []) {
      addSource(source);
    }
  } else if (parsed instanceof DeleteQuery) {
    addSource(parsed.deleteClause.source);
    for (const source of parsed.usingClause?.getSources() ?? []) {
      addSource(source);
    }
  }

  return relations;
}

function resolveDdlTable(rawName: string, ddlModel: DdlSchemaModel): DdlSchemaTable | undefined {
  const [schema, name] = splitQualifiedName(rawName);
  return ddlModel.tables.get(`${schema}.${name}`.toLowerCase())
    ?? [...ddlModel.tables.values()].find((table) => table.name.toLowerCase() === name.toLowerCase());
}

function resolveDdlColumnType(reference: ColumnReference, relations: Array<{ alias?: string; table: DdlSchemaTable }>): string | undefined {
  const namespaces = reference.namespaces?.map((namespace) => normalizeIdentifier(namespace.name)) ?? [];
  const columnName = normalizeIdentifier(reference.column.name).toLowerCase();

  if (namespaces.length > 0) {
    const qualifier = namespaces.join('.').toLowerCase();
    const lastQualifier = namespaces[namespaces.length - 1]?.toLowerCase();
    const relation = relations.find((candidate) =>
      candidate.alias?.toLowerCase() === qualifier ||
      candidate.alias?.toLowerCase() === lastQualifier ||
      candidate.table.name.toLowerCase() === qualifier ||
      candidate.table.name.toLowerCase() === lastQualifier ||
      candidate.table.canonicalName.toLowerCase() === qualifier
    );
    return relation?.table.columns.get(columnName)?.typeName;
  }

  const matches = relations
    .map((relation) => relation.table.columns.get(columnName))
    .filter((column): column is NonNullable<typeof column> => Boolean(column));
  return matches.length === 1 ? matches[0].typeName : undefined;
}

function hasTopLevelOrderBy(parsed: ReturnType<typeof SqlParser.parse>): boolean {
  return Boolean(
    (parsed instanceof SimpleSelectQuery || parsed instanceof BinarySelectQuery || parsed instanceof ValuesQuery) &&
    hasOrderByClause(parsed)
  );
}

function hasOrderByClause(value: unknown): value is { orderByClause: unknown } {
  return typeof value === 'object' && value !== null && 'orderByClause' in value && Boolean(value.orderByClause);
}

function hashSql(sql: string): string {
  return `sha256:${createHash('sha256').update(sql).digest('hex')}`;
}

function splitQualifiedName(value: string): [string, string] {
  const segments = value.split('.');
  if (segments.length === 1) {
    return ['public', normalizeIdentifier(segments[0] ?? '')];
  }
  return [normalizeIdentifier(segments[0] ?? ''), normalizeIdentifier(segments[1] ?? '')];
}

function normalizeIdentifier(value: string): string {
  return value.trim().replace(/^"/, '').replace(/"$/, '');
}

function renderParamsInterface(parameters: string[]): string {
  if (parameters.length === 0) {
    return '{ [key: string]: never; }';
  }
  return `{\n${parameters.map((parameter) => `  ${parameter}: unknown;`).join('\n')}\n}`;
}

function renderRowInterface(columns: SqlResultColumnContract[]): string {
  if (columns.length === 0) {
    return '{\n  // Fill this from mapper tests or DB-backed inspection.\n  [column: string]: unknown;\n}';
  }
  return `{\n${columns.map((column) => `  ${column.name}: ${column.type};`).join('\n')}\n}`;
}

function deriveQueryId(rootDir: string, sqlPath: string): string {
  const relative = normalizePath(path.relative(rootDir, sqlPath)).replace(/\.[^.]+$/, '');
  return relative
    .replace(/^src\/features\//, '')
    .replace(/\/queries\//g, '.')
    .replace(/\//g, '.');
}

function toPascal(value: string): string {
  return value
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join('');
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, '/');
}

function requireValue(value: string | undefined, label: string): string {
  if (!value || value.trim().length === 0) {
    throw requiredCliValueError(label);
  }
  return value;
}
