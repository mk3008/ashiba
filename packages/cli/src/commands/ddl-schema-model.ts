import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { CreateTableQuery, MultiQuerySplitter, RawString, SqlFormatter, SqlParser, TypeValue, type ValueComponent } from 'rawsql-ts';
import { astParseUserError, invalidCliInputError } from '../errors.js';

const sqlFormatter = new SqlFormatter({ keywordCase: 'lower' });

export interface DdlSchemaColumn {
  name: string;
  typeName: string;
  nullable: boolean;
  defaultValue?: string;
  generated: boolean;
  primaryKey: boolean;
}

export interface DdlSchemaTable {
  schema: string;
  name: string;
  canonicalName: string;
  columns: Map<string, DdlSchemaColumn>;
  sourceFile?: string;
}

export interface DdlSchemaModel {
  ddlDir: string;
  tables: Map<string, DdlSchemaTable>;
}

export interface DdlSchemaDiagnostic {
  code: string;
  severity: 'error' | 'warning';
  message: string;
  file?: string;
  table?: string;
  column?: string;
  nextAction?: string;
}

export interface DdlSchemaDiagnosticsResult {
  ddlDir: string;
  files: string[];
  tables: Map<string, DdlSchemaTable>;
  diagnostics: DdlSchemaDiagnostic[];
}

export function loadDdlSchemaModel(rootDir: string, ddlDir?: string): DdlSchemaModel | undefined {
  const resolvedDdlDir = ddlDir ? path.resolve(rootDir, ddlDir) : resolveDdlDir(rootDir);
  if (!existsSync(resolvedDdlDir)) {
    return undefined;
  }
  const tables = new Map<string, DdlSchemaTable>();
  for (const file of collectSqlFiles(resolvedDdlDir)) {
    for (const table of parseDdlTables(readFileSync(file, 'utf8'), file)) {
      tables.set(table.canonicalName.toLowerCase(), table);
    }
  }
  return { ddlDir: resolvedDdlDir, tables };
}

export function loadDdlSchemaModelWithDiagnostics(rootDir: string, ddlDir?: string): DdlSchemaDiagnosticsResult {
  const resolved = resolveDdlDirWithMetadata(rootDir, ddlDir);
  const diagnostics: DdlSchemaDiagnostic[] = [];
  const tables = new Map<string, DdlSchemaTable>();
  const createdTables = new Set<string>();
  const files: string[] = [];

  if (!existsSync(resolved.ddlDir)) {
    if (resolved.configured) {
      diagnostics.push({
        code: 'ASHIBA_DDL_CONFIGURED_DIR_MISSING',
        severity: 'warning',
        message: `Configured DDL directory does not exist: ${normalizePath(path.relative(rootDir, resolved.ddlDir))}.`,
        file: 'ashiba.config.json',
        nextAction: 'Create the configured DDL directory, fix ashiba.config.json, or remove the stale configuration.',
      });
    }
    return { ddlDir: resolved.ddlDir, files, tables, diagnostics };
  }

  for (const file of collectSqlFilesWithDiagnostics(rootDir, resolved.ddlDir, diagnostics)) {
    files.push(normalizePath(path.relative(rootDir, file)));
    let sql: string;
    try {
      sql = readFileSync(file, 'utf8');
    } catch (error) {
      diagnostics.push({
        code: 'ASHIBA_DDL_FILE_UNREADABLE',
        severity: 'error',
        message: `DDL file could not be read: ${normalizePath(path.relative(rootDir, file))}.`,
        file: normalizePath(path.relative(rootDir, file)),
        nextAction: error instanceof Error ? error.message : String(error),
      });
      continue;
    }

    for (const table of parseDdlTablesWithDiagnostics(rootDir, file, sql, diagnostics, createdTables)) {
      const key = table.canonicalName.toLowerCase();
      const existing = tables.get(key);
      if (existing) {
        diagnostics.push({
          code: 'ASHIBA_DDL_DUPLICATE_TABLE',
          severity: 'error',
          message: `Duplicate canonical table definition for ${table.canonicalName}: ${existing.sourceFile ?? '(unknown)'} and ${table.sourceFile ?? '(unknown)'}.`,
          file: table.sourceFile,
          table: table.canonicalName,
          nextAction: 'Keep one canonical CREATE TABLE owner for this table, then rerun ashiba project check.',
        });
        diagnostics.push({
          code: 'ASHIBA_DDL_UNSTABLE_TABLE_OWNERSHIP',
          severity: 'warning',
          message: `Table ownership is unstable because ${table.canonicalName} is defined in more than one DDL file.`,
          file: table.sourceFile,
          table: table.canonicalName,
          nextAction: 'Move the table definition to a single stable DDL file so generated models and migration review read the same owner.',
        });
        continue;
      }
      tables.set(key, table);
    }
  }

  return { ddlDir: resolved.ddlDir, files, tables, diagnostics };
}

function resolveDdlDir(rootDir: string): string {
  return resolveDdlDirWithMetadata(rootDir).ddlDir;
}

function resolveDdlDirWithMetadata(rootDir: string, ddlDir?: string): { ddlDir: string; configured: boolean } {
  if (ddlDir) {
    return { ddlDir: path.resolve(rootDir, ddlDir), configured: true };
  }
  const configPath = path.join(rootDir, 'ashiba.config.json');
  if (existsSync(configPath)) {
    try {
      const parsed = JSON.parse(readFileSync(configPath, 'utf8')) as { ddl?: { sourceDir?: unknown }; ddlDir?: unknown };
      if (typeof parsed.ddl?.sourceDir === 'string') {
        return { ddlDir: path.resolve(rootDir, parsed.ddl.sourceDir), configured: true };
      }
      if (typeof parsed.ddlDir === 'string') {
        return { ddlDir: path.resolve(rootDir, parsed.ddlDir), configured: true };
      }
    } catch (error) {
      throw invalidCliInputError(
        'ASHIBA_CONFIG_JSON_PARSE_FAILED',
        'Failed to parse ashiba.config.json.',
        'Fix ashiba.config.json so it is valid JSON, or remove it to use the default db/ddl directory.',
        { configPath, reason: error instanceof Error ? error.message : String(error) },
      );
    }
  }
  return { ddlDir: path.join(rootDir, 'db', 'ddl'), configured: false };
}

function collectSqlFiles(dir: string): string[] {
  const found: string[] = [];
  const directories: string[] = [];
  for (const entry of readdirSync(dir).sort()) {
    const fullPath = path.join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      directories.push(fullPath);
    } else if (stat.isFile() && entry.toLowerCase().endsWith('.sql')) {
      found.push(fullPath);
    }
  }
  for (const directory of directories) {
    found.push(...collectSqlFiles(directory));
  }
  return found;
}

function collectSqlFilesWithDiagnostics(rootDir: string, dir: string, diagnostics: DdlSchemaDiagnostic[]): string[] {
  const found: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch (error) {
    diagnostics.push({
      code: 'ASHIBA_DDL_DIR_UNREADABLE',
      severity: 'error',
      message: `DDL directory could not be read: ${normalizePath(path.relative(rootDir, dir))}.`,
      file: normalizePath(path.relative(rootDir, dir)),
      nextAction: error instanceof Error ? error.message : String(error),
    });
    return found;
  }
  const directories: string[] = [];
  for (const entry of entries.sort()) {
    const fullPath = path.join(dir, entry);
    let stat: ReturnType<typeof statSync>;
    try {
      stat = statSync(fullPath);
    } catch (error) {
      diagnostics.push({
        code: 'ASHIBA_DDL_FILE_UNREADABLE',
        severity: 'error',
        message: `DDL path could not be inspected: ${normalizePath(path.relative(rootDir, fullPath))}.`,
        file: normalizePath(path.relative(rootDir, fullPath)),
        nextAction: error instanceof Error ? error.message : String(error),
      });
      continue;
    }
    if (stat.isDirectory()) {
      directories.push(fullPath);
    } else if (stat.isFile() && entry.toLowerCase().endsWith('.sql')) {
      found.push(fullPath);
    }
  }
  for (const directory of directories) {
    found.push(...collectSqlFilesWithDiagnostics(rootDir, directory, diagnostics));
  }
  return found;
}

function parseDdlTables(sql: string, sourceFile?: string): DdlSchemaTable[] {
  return MultiQuerySplitter.split(sql).getNonEmpty().flatMap((statement) => {
    let parsed: ReturnType<typeof SqlParser.parse>;
    try {
      parsed = SqlParser.parse(statement.sql);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw astParseUserError({
        code: 'ASHIBA_DDL_SCHEMA_MODEL_AST_PARSE_FAILED',
        message: 'DDL AST parse failed while reading CREATE TABLE schema metadata.',
        reason,
        sqlKind: 'DDL',
        operation: 'reading CREATE TABLE schema metadata',
      });
    }
    return parsed instanceof CreateTableQuery ? [createDdlSchemaTable(parsed, sourceFile)] : [];
  });
}

function parseDdlTablesWithDiagnostics(
  rootDir: string,
  file: string,
  sql: string,
  diagnostics: DdlSchemaDiagnostic[],
  createdTables: Set<string>,
): DdlSchemaTable[] {
  const tables: DdlSchemaTable[] = [];
  for (const statement of MultiQuerySplitter.split(sql).getNonEmpty()) {
    let parsed: ReturnType<typeof SqlParser.parse>;
    try {
      parsed = SqlParser.parse(statement.sql);
    } catch (error) {
      diagnostics.push({
        code: 'ASHIBA_DDL_PARSE_FAILED',
        severity: 'error',
        message: `DDL parse failed while reading ${normalizePath(path.relative(rootDir, file))}.`,
        file: normalizePath(path.relative(rootDir, file)),
        nextAction: error instanceof Error ? error.message : String(error),
      });
      continue;
    }
    if (parsed instanceof CreateTableQuery) {
      const table = createDdlSchemaTable(parsed, normalizePath(path.relative(rootDir, file)));
      tables.push(table);
      createdTables.add(table.canonicalName.toLowerCase());
    } else if (/^\s*create\s+table\b/i.test(statement.sql)) {
      diagnostics.push({
        code: 'ASHIBA_DDL_PARSE_FAILED',
        severity: 'error',
        message: `DDL parse did not produce a CREATE TABLE AST while reading ${normalizePath(path.relative(rootDir, file))}.`,
        file: normalizePath(path.relative(rootDir, file)),
        nextAction: 'Check CREATE TABLE syntax or report a rawsql-ts parser gap if the DDL is valid.',
      });
    } else if (/^\s*alter\s+table\b/i.test(statement.sql)) {
      const target = extractAlterTableTarget(statement.sql);
      if (target && !createdTables.has(target.toLowerCase())) {
        diagnostics.push({
          code: 'ASHIBA_DDL_ALTER_BEFORE_CREATE',
          severity: 'error',
          message: `ALTER TABLE references ${target} before its CREATE TABLE statement in DDL execution order.`,
          file: normalizePath(path.relative(rootDir, file)),
          table: target,
          nextAction: 'Move the CREATE TABLE statement earlier, rename DDL files/folders so execution order is clear, or append the ALTER after the CREATE owner.',
        });
      }
    }
  }
  return tables;
}

function createDdlSchemaTable(parsed: CreateTableQuery, sourceFile?: string): DdlSchemaTable {
  const schema = normalizeIdentifier(parsed.namespaces?.[0] ?? 'public');
  const name = normalizeIdentifier(parsed.tableName.name);
  const tablePrimaryKeys = new Set(
    parsed.tableConstraints
      .filter((constraint) => constraint.kind === 'primary-key')
      .flatMap((constraint) => constraint.columns ?? [])
      .map((column) => normalizeIdentifier(column.name).toLowerCase())
  );

  const columns = new Map<string, DdlSchemaColumn>();
  for (const column of parsed.columns) {
    const columnName = normalizeIdentifier(column.name.name);
    const primaryKey = tablePrimaryKeys.has(columnName.toLowerCase())
      || column.constraints.some((constraint) => constraint.kind === 'primary-key');
    const generated = column.constraints.some((constraint) =>
      constraint.kind === 'generated-always-identity' || constraint.kind === 'generated-by-default-identity'
    );
    const defaultValue = column.constraints.find((constraint) => constraint.kind === 'default')?.defaultValue;
    const nullable = !primaryKey
      && !column.constraints.some((constraint) => constraint.kind === 'not-null' || constraint.kind === 'primary-key');
    columns.set(columnName.toLowerCase(), {
      name: columnName,
      typeName: getColumnTypeName(column.dataType),
      nullable,
      defaultValue: defaultValue ? formatValue(defaultValue) : undefined,
      generated,
      primaryKey,
    });
  }
  return { schema, name, canonicalName: `${schema}.${name}`, columns, sourceFile };
}

function getColumnTypeName(dataType: CreateTableQuery['columns'][number]['dataType']): string {
  if (dataType instanceof TypeValue) {
    return dataType.getTypeName();
  }
  if (dataType instanceof RawString) {
    return dataType.value.trim();
  }
  return 'unknown';
}

function normalizeIdentifier(value: string): string {
  return value.trim().replace(/^"/, '').replace(/"$/, '');
}

function extractAlterTableTarget(sql: string): string | undefined {
  const match = /^\s*alter\s+table\s+(?:if\s+exists\s+)?((?:"[^"]+"|[A-Za-z_][A-Za-z0-9_$]*)(?:\s*\.\s*(?:"[^"]+"|[A-Za-z_][A-Za-z0-9_$]*))?)/i.exec(sql);
  const raw = match?.[1];
  if (!raw) return undefined;
  const parts = raw.split('.').map((part) => normalizeIdentifier(part.trim()));
  return parts.length === 1 ? `public.${parts[0]}` : `${parts[0]}.${parts[1]}`;
}

function formatValue(value: ValueComponent): string {
  return sqlFormatter.format(value).formattedSql.replace(/"([A-Za-z_][A-Za-z0-9_$]*)"/g, '$1');
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, '/');
}
