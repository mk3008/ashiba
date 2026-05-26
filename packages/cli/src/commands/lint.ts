import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import type { Command } from 'commander';
import {
  BinarySelectQuery,
  ColumnReference,
  ColumnReferenceCollector,
  DeleteQuery,
  InsertQuery,
  SimpleSelectQuery,
  SqlParser,
  TableSource,
  UpdateQuery,
  type CommonTable,
  type SelectQuery,
  type SourceExpression,
  type SqlComponent,
  type ValueComponent,
} from 'rawsql-ts';
import { runQueryLint } from './query.js';
import { loadDdlSchemaModel, type DdlSchemaModel, type DdlSchemaTable } from './ddl-schema-model.js';
import { astParseUserError, invalidCliInputError } from '../errors.js';

export interface LintOptions {
  rootDir?: string;
  ddlDir?: string;
  format?: 'text' | 'json';
  rules?: string;
}

export interface LintResult {
  rootDir: string;
  target: string;
  files: Array<{
    file: string;
    ok: boolean;
    output: string;
    ddlIssues: DdlLintIssue[];
    analysisNotes: string[];
  }>;
  ok: boolean;
}

interface DdlLintIssue {
  code: 'ddl-missing-table' | 'ddl-missing-column';
  target: string;
  message: string;
}

export function registerLintCommand(program: Command): void {
  program
    .command('lint')
    .description('Lint SQL files for maintainability and analysis-safety issues')
    .argument('<path>', 'SQL file or directory to lint')
    .option('--root-dir <path>', 'Project root for config and DDL-aware rules', '.')
    .option('--ddl-dir <path>', 'DDL directory for DDL-aware table and column checks')
    .option('--format <format>', 'Output format: text or json', 'text')
    .option('--rules <list>', 'Comma-separated query lint rules')
    .action((targetPath: string, options: LintOptions) => {
      const result = runLint(targetPath, options);
      if (options.format === 'json') {
        process.stdout.write(`${JSON.stringify({ kind: 'lint', ...result }, null, 2)}\n`);
      } else {
        process.stdout.write(formatLintResult(result));
      }
      if (!result.ok) process.exitCode = 1;
    });
}

export function runLint(targetPath: string, options: LintOptions = {}): LintResult {
  const rootDir = path.resolve(options.rootDir ?? '.');
  const target = path.resolve(rootDir, targetPath);
  const files = collectTargetSqlFiles(target);
  const ddlModel = loadDdlSchemaModel(rootDir, options.ddlDir);
  const results = files.map((file) => {
    try {
      const output = runQueryLint(file, { rootDir, rules: options.rules, format: 'text' });
      const ddlIssues = ddlModel ? lintSqlAgainstDdl(readFileSync(file, 'utf8'), ddlModel) : [];
      return {
        file: normalizePath(path.relative(rootDir, file)),
        ok: ddlIssues.length === 0 && !/^\[(error|warn)\]/m.test(output) && !/analysis-risk|unused-cte|join-direction/.test(output),
        output: appendDdlIssueOutput(output, ddlIssues),
        ddlIssues,
        analysisNotes: [],
      };
    } catch (error) {
      return {
        file: normalizePath(path.relative(rootDir, file)),
        ok: false,
        output: error instanceof Error ? error.message : String(error),
        ddlIssues: [],
        analysisNotes: [],
      };
    }
  });

  return {
    rootDir,
    target: normalizePath(path.relative(rootDir, target)),
    files: results,
    ok: results.every((result) => result.ok),
  };
}

function collectTargetSqlFiles(target: string): string[] {
  if (!existsSync(target)) {
    throw invalidCliInputError(
      'ASHIBA_LINT_TARGET_NOT_FOUND',
      `Lint target does not exist: ${target}.`,
      'Check the path passed to ashiba lint, or generate the expected SQL file/directory before linting.',
      { target },
    );
  }
  const stat = statSync(target);
  if (stat.isFile()) {
    if (!target.toLowerCase().endsWith('.sql')) {
      throw invalidCliInputError(
        'ASHIBA_LINT_TARGET_UNSUPPORTED',
        `Lint target must be a .sql file or directory: ${target}.`,
        'Pass a .sql file or a directory containing visible SQL files.',
        { target },
      );
    }
    return [target];
  }
  if (!stat.isDirectory()) {
    throw invalidCliInputError(
      'ASHIBA_LINT_TARGET_UNSUPPORTED',
      `Lint target must be a .sql file or directory: ${target}.`,
      'Pass a .sql file or a directory containing visible SQL files.',
      { target },
    );
  }
  const files: string[] = [];
  for (const entry of readdirSync(target)) {
    const fullPath = path.join(target, entry);
    const childStat = statSync(fullPath);
    if (childStat.isDirectory()) {
      files.push(...collectTargetSqlFiles(fullPath));
    } else if (childStat.isFile() && entry.toLowerCase().endsWith('.sql')) {
      files.push(fullPath);
    }
  }
  return files.sort();
}

function lintSqlAgainstDdl(sql: string, model: DdlSchemaModel): DdlLintIssue[] {
  let parsed: ReturnType<typeof SqlParser.parse>;
  try {
    parsed = SqlParser.parse(sql);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw astParseUserError({
      code: 'ASHIBA_LINT_SQL_AST_PARSE_FAILED',
      message: 'SQL AST parse failed while running DDL-aware lint.',
      reason,
      sqlKind: 'SQL',
      operation: 'running DDL-aware lint',
    });
  }

  const tableRefs = collectTableReferences(parsed);
  const issues: DdlLintIssue[] = [];
  const aliasToTable = new Map<string, DdlSchemaTable>();

  for (const reference of tableRefs) {
    const table = resolveTable(model, reference.schema, reference.table);
    if (!table) {
      issues.push({
        code: 'ddl-missing-table',
        target: reference.schema ? `${reference.schema}.${reference.table}` : reference.table,
        message: `SQL references a table that is not present in DDL: ${reference.schema ? `${reference.schema}.${reference.table}` : reference.table}.`,
      });
      continue;
    }
    aliasToTable.set(reference.alias.toLowerCase(), table);
    aliasToTable.set(reference.table.toLowerCase(), table);
    aliasToTable.set(table.canonicalName.toLowerCase(), table);
  }

  for (const reference of collectQualifiedColumnReferences(parsed)) {
    const table = aliasToTable.get(reference.qualifier.toLowerCase());
    if (!table || reference.column === '*') {
      continue;
    }
    if (!table.columns.has(reference.column.toLowerCase())) {
      issues.push({
        code: 'ddl-missing-column',
        target: `${table.canonicalName}.${reference.column}`,
        message: `SQL references a column that is not present in DDL: ${reference.qualifier}.${reference.column} -> ${table.canonicalName}.`,
      });
    }
  }

  const unambiguousTables = [...new Map([...aliasToTable.values()].map((table) => [table.canonicalName.toLowerCase(), table])).values()];
  if (unambiguousTables.length === 1) {
    const table = unambiguousTables[0];
    if (table) {
      for (const reference of collectUnqualifiedColumnReferences(parsed)) {
        if (!table.columns.has(reference.column.toLowerCase())) {
          issues.push({
            code: 'ddl-missing-column',
            target: `${table.canonicalName}.${reference.column}`,
            message: `${reference.context} references a column that is not present in DDL: ${table.canonicalName}.${reference.column}.`,
          });
        }
      }
    }
  }

  for (const insert of collectInsertColumnReferences(parsed)) {
    const table = resolveTable(model, insert.schema, insert.table);
    if (!table) {
      continue;
    }
    for (const column of insert.columns) {
      if (!table.columns.has(column.toLowerCase())) {
        issues.push({
          code: 'ddl-missing-column',
          target: `${table.canonicalName}.${column}`,
          message: `INSERT references a column that is not present in DDL: ${table.canonicalName}.${column}.`,
        });
      }
    }
  }

  for (const update of collectUpdateSetColumnReferences(parsed)) {
    const table = resolveTable(model, update.schema, update.table);
    if (!table) {
      continue;
    }
    for (const column of update.columns) {
      if (!table.columns.has(column.toLowerCase())) {
        issues.push({
          code: 'ddl-missing-column',
          target: `${table.canonicalName}.${column}`,
          message: `UPDATE references a column that is not present in DDL: ${table.canonicalName}.${column}.`,
        });
      }
    }
  }

  for (const returning of collectMutationReturningColumnReferences(parsed)) {
    const table = resolveTable(model, returning.schema, returning.table);
    if (!table) {
      continue;
    }
    for (const column of returning.columns) {
      if (!table.columns.has(column.toLowerCase())) {
        issues.push({
          code: 'ddl-missing-column',
          target: `${table.canonicalName}.${column}`,
          message: `RETURNING references a column that is not present in DDL: ${table.canonicalName}.${column}.`,
        });
      }
    }
  }

  return dedupeDdlIssues(issues);
}

function appendDdlIssueOutput(output: string, issues: DdlLintIssue[], notes: string[] = []): string {
  if (issues.length === 0 && notes.length === 0) {
    return output;
  }
  const noteLines = notes.map((note) => `[info] ${note}`);
  const issueLines = issues.map((issue) => `[error] ${issue.code}: ${issue.message}`);
  return `${output.trimEnd()}\n${[...noteLines, ...issueLines].join('\n')}\n`;
}

function resolveTable(model: DdlSchemaModel, schema: string | undefined, table: string): DdlSchemaTable | undefined {
  if (schema) {
    return model.tables.get(`${schema}.${table}`.toLowerCase());
  }
  const matches = [...model.tables.values()].filter((candidate) => candidate.name.toLowerCase() === table.toLowerCase());
  return matches.length === 1 ? matches[0] : undefined;
}

function collectTableReferences(query: ReturnType<typeof SqlParser.parse>): Array<{ schema?: string; table: string; alias: string }> {
  const references: Array<{ schema?: string; table: string; alias: string }> = [];
  const addSource = (source: SourceExpression | null | undefined) => {
    if (!source || !(source.datasource instanceof TableSource)) return;
    const [schema, table] = splitQualifiedName(source.datasource.qualifiedName.toString());
    references.push({ schema, table, alias: normalizeIdentifier(source.getAliasName() ?? table) });
  };
  const addCtes = (ctes: CommonTable[] | null | undefined) => {
    for (const cte of ctes ?? []) collectFromQuery(cte.query);
  };
  const collectSelect = (selectQuery: SelectQuery) => {
    if (selectQuery instanceof SimpleSelectQuery) {
      addCtes(selectQuery.withClause?.tables);
      const cteNames = new Set((selectQuery.withClause?.tables ?? []).map((cte) => cte.getSourceAliasName().toLowerCase()));
      for (const source of selectQuery.fromClause?.getSources() ?? []) {
        if (source.datasource instanceof TableSource && cteNames.has(source.datasource.table.name.toLowerCase())) continue;
        addSource(source);
      }
    } else if (selectQuery instanceof BinarySelectQuery) {
      collectSelect(selectQuery.left);
      collectSelect(selectQuery.right);
    }
  };
  const collectFromQuery = (value: ReturnType<typeof SqlParser.parse> | SelectQuery) => {
    if (value instanceof SimpleSelectQuery || value instanceof BinarySelectQuery) {
      collectSelect(value);
    } else if (value instanceof InsertQuery) {
      addSource(value.insertClause.source);
    } else if (value instanceof UpdateQuery) {
      addCtes(value.withClause?.tables);
      addSource(value.updateClause.source);
      for (const source of value.fromClause?.getSources() ?? []) addSource(source);
    } else if (value instanceof DeleteQuery) {
      addCtes(value.withClause?.tables);
      addSource(value.deleteClause.source);
      for (const source of value.usingClause?.getSources() ?? []) addSource(source);
    }
  };
  collectFromQuery(query);
  return references;
}

function collectQualifiedColumnReferences(query: ReturnType<typeof SqlParser.parse>): Array<{ qualifier: string; column: string }> {
  return collectColumnReferences(query)
    .filter((reference) => reference.getNamespace())
    .map((reference) => ({
      qualifier: normalizeIdentifier(reference.getNamespace()),
      column: normalizeIdentifier(reference.column.name),
    }));
}

function collectUnqualifiedColumnReferences(query: ReturnType<typeof SqlParser.parse>): Array<{ context: string; column: string }> {
  const references: Array<{ context: string; column: string }> = [];
  const collectSelect = (selectQuery: SelectQuery) => {
    if (selectQuery instanceof BinarySelectQuery) {
      collectSelect(selectQuery.left);
      collectSelect(selectQuery.right);
      return;
    }
    if (!(selectQuery instanceof SimpleSelectQuery)) return;
    references.push(...collectContextColumns('SELECT', selectQuery.selectClause));
    references.push(...collectContextColumns('WHERE', selectQuery.whereClause?.condition));
    references.push(...collectContextColumns('GROUP BY', selectQuery.groupByClause));
    references.push(...collectContextColumns('HAVING', selectQuery.havingClause?.condition));
    references.push(...collectContextColumns('ORDER BY', selectQuery.orderByClause));
  };
  if (query instanceof SimpleSelectQuery || query instanceof BinarySelectQuery) {
    collectSelect(query);
  } else if (query instanceof UpdateQuery) {
    references.push(...collectContextColumns('WHERE', query.whereClause?.condition));
  } else if (query instanceof DeleteQuery) {
    references.push(...collectContextColumns('WHERE', query.whereClause?.condition));
  }
  return dedupeUnqualifiedReferences(references);
}

function collectContextColumns(context: string, component: SqlComponent | ValueComponent | null | undefined): Array<{ context: string; column: string }> {
  if (!component) return [];
  return collectColumnReferences(component as SqlComponent)
    .filter((reference) => !reference.getNamespace() && reference.column.name !== '*')
    .map((reference) => ({ context, column: normalizeIdentifier(reference.column.name) }));
}

function collectColumnReferences(component: SqlComponent): ColumnReference[] {
  return new ColumnReferenceCollector().collect(component);
}

function dedupeUnqualifiedReferences(references: Array<{ context: string; column: string }>): Array<{ context: string; column: string }> {
  const seen = new Set<string>();
  return references.filter((reference) => {
    const key = `${reference.context}:${reference.column.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function collectInsertColumnReferences(query: ReturnType<typeof SqlParser.parse>): Array<{ schema?: string; table: string; columns: string[] }> {
  if (!(query instanceof InsertQuery)) return [];
  const target = tableTargetFromSource(query.insertClause.source);
  return target ? [{ ...target, columns: (query.insertClause.columns ?? []).map((column) => normalizeIdentifier(column.name)) }] : [];
}

function collectUpdateSetColumnReferences(query: ReturnType<typeof SqlParser.parse>): Array<{ schema?: string; table: string; columns: string[] }> {
  if (!(query instanceof UpdateQuery)) return [];
  const target = tableTargetFromSource(query.updateClause.source);
  return target ? [{
    ...target,
    columns: query.setClause.items.map((item) => normalizeIdentifier(item.column.name)),
  }] : [];
}

function collectMutationReturningColumnReferences(query: ReturnType<typeof SqlParser.parse>): Array<{ schema?: string; table: string; columns: string[] }> {
  const returningClause = query instanceof InsertQuery || query instanceof UpdateQuery || query instanceof DeleteQuery
    ? query.returningClause
    : null;
  if (!returningClause) return [];
  const target = query instanceof InsertQuery
    ? tableTargetFromSource(query.insertClause.source)
    : query instanceof UpdateQuery
      ? tableTargetFromSource(query.updateClause.source)
      : query instanceof DeleteQuery
        ? tableTargetFromSource(query.deleteClause.source)
        : undefined;
  if (!target) return [];
  return [{
    ...target,
    columns: returningClause.items.flatMap((item) => collectColumnReferences(item.value as SqlComponent))
      .filter((column) => column.column.name !== '*')
      .map((column) => normalizeIdentifier(column.column.name)),
  }];
}

function tableTargetFromSource(source: SourceExpression | null | undefined): { schema?: string; table: string } | undefined {
  if (!source || !(source.datasource instanceof TableSource)) return undefined;
  const [schema, table] = splitQualifiedName(source.datasource.qualifiedName.toString());
  return { schema, table };
}

function dedupeDdlIssues(issues: DdlLintIssue[]): DdlLintIssue[] {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.code}:${issue.target}:${issue.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function splitQualifiedName(value: string): [string | undefined, string] {
  const segments = value.split('.');
  if (segments.length === 1) {
    return [undefined, normalizeIdentifier(segments[0] ?? '')];
  }
  return [normalizeIdentifier(segments[0] ?? ''), normalizeIdentifier(segments[1] ?? '')];
}

function normalizeIdentifier(value: string): string {
  return value.trim().replace(/^"/, '').replace(/"$/, '');
}

function formatLintResult(result: LintResult): string {
  const lines = [`Ashiba lint: ${result.ok ? 'ok' : 'failed'}`, `- target: ${result.target}`, `- files: ${result.files.length}`];
  for (const file of result.files) {
    lines.push('', `## ${file.file}`, file.output.trimEnd());
  }
  return `${lines.join('\n')}\n`;
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, '/');
}
