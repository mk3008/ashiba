import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { CreateTableQuery, MultiQuerySplitter, RawString, SqlParser, TypeValue } from 'rawsql-ts';
import { astParseUserError, invalidCliInputError } from '../errors.js';

export interface DdlSchemaColumn {
  name: string;
  typeName: string;
  nullable: boolean;
}

export interface DdlSchemaTable {
  schema: string;
  name: string;
  canonicalName: string;
  columns: Map<string, DdlSchemaColumn>;
}

export interface DdlSchemaModel {
  ddlDir: string;
  tables: Map<string, DdlSchemaTable>;
}

export function loadDdlSchemaModel(rootDir: string, ddlDir?: string): DdlSchemaModel | undefined {
  const resolvedDdlDir = ddlDir ? path.resolve(rootDir, ddlDir) : resolveDdlDir(rootDir);
  if (!existsSync(resolvedDdlDir)) {
    return undefined;
  }
  const tables = new Map<string, DdlSchemaTable>();
  for (const file of collectSqlFiles(resolvedDdlDir)) {
    for (const table of parseDdlTables(readFileSync(file, 'utf8'))) {
      tables.set(table.canonicalName.toLowerCase(), table);
    }
  }
  return { ddlDir: resolvedDdlDir, tables };
}

function resolveDdlDir(rootDir: string): string {
  const configPath = path.join(rootDir, 'ashiba.config.json');
  if (existsSync(configPath)) {
    try {
      const parsed = JSON.parse(readFileSync(configPath, 'utf8')) as { ddl?: { sourceDir?: unknown }; ddlDir?: unknown };
      if (typeof parsed.ddl?.sourceDir === 'string') {
        return path.resolve(rootDir, parsed.ddl.sourceDir);
      }
      if (typeof parsed.ddlDir === 'string') {
        return path.resolve(rootDir, parsed.ddlDir);
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
  return path.join(rootDir, 'db', 'ddl');
}

function collectSqlFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      found.push(...collectSqlFiles(fullPath));
    } else if (stat.isFile() && entry.toLowerCase().endsWith('.sql')) {
      found.push(fullPath);
    }
  }
  return found.sort();
}

function parseDdlTables(sql: string): DdlSchemaTable[] {
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
    return parsed instanceof CreateTableQuery ? [createDdlSchemaTable(parsed)] : [];
  });
}

function createDdlSchemaTable(parsed: CreateTableQuery): DdlSchemaTable {
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
    const nullable = !tablePrimaryKeys.has(columnName.toLowerCase())
      && !column.constraints.some((constraint) => constraint.kind === 'not-null' || constraint.kind === 'primary-key');
    columns.set(columnName.toLowerCase(), {
      name: columnName,
      typeName: getColumnTypeName(column.dataType),
      nullable,
    });
  }
  return { schema, name, canonicalName: `${schema}.${name}`, columns };
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
