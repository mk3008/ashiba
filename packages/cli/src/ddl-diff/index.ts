export type {
  ApplyPlanOperation,
  ApplyPlanOperationKind,
  DdlApplyPlan,
  DdlDiffArtifacts,
  DdlDiffChangeKind,
  DdlDiffRisks,
  DdlDiffSummaryEntry,
  DestructiveRisk,
  DestructiveRiskKind,
  OperationalRisk,
  OperationalRiskKind,
  RiskGuidanceKind,
} from './contracts.js';
export { analyzeMigrationPlanRisks, analyzeMigrationSqlRisks } from './risk.js';
export { AshibaDdlDiffError } from './errors.js';

import {
  CreateSchemaStatement,
  CreateTableQuery,
  DDLDiffGenerator,
  MultiQuerySplitter,
  RawString,
  SqlParser,
  TypeValue,
  type TableColumnDefinition,
} from 'rawsql-ts';
import { analyzeMigrationSqlRisks } from './risk.js';
import { AshibaDdlDiffError } from './errors.js';
import type {
  ApplyPlanOperation,
  DestructiveRisk,
  DdlApplyPlan,
  DdlDiffRisks,
  DdlDiffSummaryEntry,
  OperationalRisk,
} from './contracts.js';

export interface CompareDdlSqlOptions {
  localSql: string;
  remoteSql: string;
  safety?: DdlDiffSafetyOptions;
}

export interface DdlDiffSafetyOptions {
  dropTables?: boolean;
  dropColumns?: boolean;
  dropConstraints?: boolean;
  dropIndexes?: boolean;
}

export interface CompareDdlSqlResult {
  sql: string;
  text: string;
  json: string;
  hasChanges: boolean;
  summary: DdlDiffSummaryEntry[];
  applyPlan: DdlApplyPlan;
  risks: DdlDiffRisks;
}

interface TableDefinition {
  key: string;
  schema: string;
  table: string;
  statement: string;
  normalizedStatement: string;
  columns: Map<string, ParsedColumn>;
}

interface ParsedColumn {
  name: string;
  type: string;
  nullable: boolean;
}

interface ParsedSchemaModel {
  tableDefinitions: Map<string, TableDefinition>;
  createSchemaStatements: string[];
}

export function compareDdlSql(options: CompareDdlSqlOptions): CompareDdlSqlResult {
  const localModel = parseSchemaModel(options.localSql);
  const remoteModel = parseSchemaModel(options.remoteSql);
  const summary = buildSummary(localModel, remoteModel);
  const applyPlan = buildApplyPlan(localModel, remoteModel, summary);
  const hasChanges = summary.length > 0;
  const sql = hasChanges ? renderApplySql(options.remoteSql, options.localSql, options.safety) : '-- No schema differences detected.\n';
  const risks = mergeDdlRisks(
    analyzeMigrationSqlRisks(sql),
    buildSuppressedOperationRisks(summary, options.safety),
  );
  const text = buildTextSummary(summary, risks, hasChanges);
  const json = `${JSON.stringify({
    kind: 'ddl-diff',
    summary,
    applyPlan,
    risks,
    hasChanges,
  }, null, 2)}\n`;

  return {
    sql,
    text,
    json,
    hasChanges,
    summary,
    applyPlan,
    risks,
  };
}

function buildTextSummary(summary: DdlDiffSummaryEntry[], risks: DdlDiffRisks, hasChanges: boolean): string {
  const lines = ['Migration summary'];
  if (!hasChanges) {
    lines.push('- no schema differences detected');
  } else {
    for (const entry of summary) {
      lines.push(`- ${entry.schema}.${entry.table}: ${formatSummaryEntry(entry)}`);
    }
  }

  lines.push('', 'Destructive risks');
  lines.push(...formatRiskLines(risks.destructiveRisks));
  lines.push('', 'Operational risks');
  lines.push(...formatRiskLines(risks.operationalRisks));
  return `${lines.join('\n')}\n`;
}

function formatRiskLines(risks: Array<{ kind: string; target?: string; from?: string; to?: string; guidance?: string[] }>): string[] {
  if (risks.length === 0) {
    return ['- none'];
  }

  const lines: string[] = [];
  for (const risk of risks) {
    if (risk.from && risk.to) {
      lines.push(`- ${risk.kind}: ${risk.from} -> ${risk.to}`);
    } else {
      lines.push(`- ${risk.kind}: ${String(risk.target ?? 'unknown')}`);
    }
    if (risk.guidance && risk.guidance.length > 0) {
      lines.push(`  guidance: ${risk.guidance.join(', ')}`);
    }
  }
  return lines;
}

function buildSuppressedOperationRisks(summary: DdlDiffSummaryEntry[], safety: DdlDiffSafetyOptions = {}): DdlDiffRisks {
  const destructiveRisks: DestructiveRisk[] = [];
  for (const entry of summary) {
    const table = `${entry.schema}.${entry.table}`;
    if (entry.changeKind === 'drop_table' && safety.dropTables === false) {
      destructiveRisks.push(createGuidedRisk('drop_table', table));
      destructiveRisks.push(createGuidedRisk('cascade_drop', table));
    } else if (entry.changeKind === 'drop_column' && safety.dropColumns === false) {
      destructiveRisks.push(createGuidedRisk('drop_column', `${table}.${String(entry.details.column)}`));
    }
  }
  return { destructiveRisks, operationalRisks: [] };
}

function mergeDdlRisks(left: DdlDiffRisks, right: DdlDiffRisks): DdlDiffRisks {
  return {
    destructiveRisks: dedupeDestructiveRisks([...left.destructiveRisks, ...right.destructiveRisks]),
    operationalRisks: dedupeOperationalRisks([...left.operationalRisks, ...right.operationalRisks]),
  };
}

function createGuidedRisk(kind: 'drop_table' | 'drop_column' | 'cascade_drop', target: string): DestructiveRisk {
  return {
    kind,
    target,
    avoidable: true,
    guidance: ['review_if_required', 'avoid_if_possible'],
  };
}

function dedupeDestructiveRisks(risks: DestructiveRisk[]): DestructiveRisk[] {
  const seen = new Map<string, DestructiveRisk>();
  for (const risk of risks) {
    const key = JSON.stringify({
      kind: risk.kind,
      target: risk.target ?? '',
      from: risk.from ?? '',
      to: risk.to ?? '',
    });
    if (!seen.has(key)) seen.set(key, risk);
  }
  return [...seen.values()].sort((left, right) =>
    `${left.kind}:${left.target ?? left.from ?? ''}:${left.to ?? ''}`
      .localeCompare(`${right.kind}:${right.target ?? right.from ?? ''}:${right.to ?? ''}`)
  );
}

function dedupeOperationalRisks(risks: OperationalRisk[]): OperationalRisk[] {
  const seen = new Map<string, OperationalRisk>();
  for (const risk of risks) {
    const key = `${risk.kind}:${risk.target}`;
    if (!seen.has(key)) seen.set(key, risk);
  }
  return [...seen.values()].sort((left, right) =>
    `${left.kind}:${left.target}`.localeCompare(`${right.kind}:${right.target}`)
  );
}

function formatSummaryEntry(entry: DdlDiffSummaryEntry): string {
  switch (entry.changeKind) {
    case 'create_table':
      return 'create table';
    case 'drop_table':
      return 'drop table';
    case 'add_column':
      return `add column ${String(entry.details.column)} ${String(entry.details.type)}${entry.details.nullable ? ' null' : ' not null'}`;
    case 'drop_column':
      return `drop column ${String(entry.details.column)}`;
    case 'alter_type':
      return `alter column ${String(entry.details.column)} type ${String(entry.details.from)} -> ${String(entry.details.to)}`;
    case 'alter_nullability':
      return `alter column ${String(entry.details.column)} nullability ${String(entry.details.from)} -> ${String(entry.details.to)}`;
    case 'table_rebuild':
      return 'table definition changed';
    case 'schema_change':
      return String(entry.details.message ?? 'schema-level change');
  }
}

function buildApplyPlan(
  localModel: ParsedSchemaModel,
  remoteModel: ParsedSchemaModel,
  summary: DdlDiffSummaryEntry[]
): DdlApplyPlan {
  const operations: ApplyPlanOperation[] = [];
  const summaryByTable = groupSummaryByTable(summary);
  const remoteSchemas = collectKnownSchemas(remoteModel);

  for (const statement of localModel.createSchemaStatements) {
    const schemaName = extractCreatedSchemaName(statement);
    if (schemaName && remoteSchemas.has(schemaName)) {
      continue;
    }
    operations.push({ kind: 'emit_schema_statement', sql: statement.trim().replace(/;?$/, ';') });
  }

  for (const [key, remoteTable] of remoteModel.tableDefinitions.entries()) {
    const localTable = localModel.tableDefinitions.get(key);
    if (!localTable) {
      operations.push({
        kind: 'drop_table_cascade',
        target: key,
        sql: `DROP TABLE IF EXISTS ${quoteQualifiedName(remoteTable.schema, remoteTable.table)} CASCADE;`,
      });
      continue;
    }

    if (localTable.normalizedStatement !== remoteTable.normalizedStatement) {
      operations.push({
        kind: 'drop_table_cascade',
        target: key,
        sql: `DROP TABLE IF EXISTS ${quoteQualifiedName(localTable.schema, localTable.table)} CASCADE;`,
      });
      operations.push({ kind: 'recreate_table', target: key });

      for (const entry of summaryByTable.get(key) ?? []) {
        const columnTarget = entry.details.column ? `${key}.${String(entry.details.column)}` : key;
        if (entry.changeKind === 'drop_column') {
          operations.push({ kind: 'drop_column_effect', target: columnTarget });
        } else if (entry.changeKind === 'alter_type') {
          operations.push({ kind: 'alter_type_effect', target: columnTarget });
        } else if (entry.changeKind === 'alter_nullability' && entry.details.from === 'nullable' && entry.details.to === 'not-null') {
          operations.push({ kind: 'nullability_tighten_effect', target: columnTarget });
        }
      }
    }
  }

  for (const [key, localTable] of localModel.tableDefinitions.entries()) {
    const remoteTable = remoteModel.tableDefinitions.get(key);
    const recreated = operations.some((operation) => operation.kind === 'recreate_table' && operation.target === key);
    if (!remoteTable || recreated) {
      operations.push({
        kind: 'create_table',
        target: key,
        sql: localTable.statement.trim().replace(/;?$/, ';'),
      });
    }
  }

  return { operations };
}

function renderApplySql(currentSql: string, expectedSql: string, safety: DdlDiffSafetyOptions = {}): string {
  const statements = DDLDiffGenerator.generateDiff(currentSql, expectedSql, {
    dropTables: safety.dropTables ?? true,
    dropColumns: safety.dropColumns ?? true,
    dropConstraints: safety.dropConstraints ?? true,
    dropIndexes: safety.dropIndexes ?? true,
    checkConstraintNames: false,
  });
  return statements.length > 0 ? `${statements.join('\n\n')}\n` : '-- No schema differences detected.\n';
}

function parseSchemaModel(sql: string): ParsedSchemaModel {
  const tableDefinitions = new Map<string, TableDefinition>();
  const createSchemaStatements: string[] = [];

  for (const statement of parseDdlStatements(sql)) {
    const tableDefinition = createTableDefinition(statement.parsed, statement.sql);
    if (tableDefinition) {
      tableDefinitions.set(tableDefinition.key, tableDefinition);
      continue;
    }
    if (statement.parsed instanceof CreateSchemaStatement) {
      createSchemaStatements.push(statement.sql);
    }
  }

  return { tableDefinitions, createSchemaStatements };
}

function parseDdlStatements(sql: string): Array<{ sql: string; parsed: ReturnType<typeof SqlParser.parse> }> {
  return MultiQuerySplitter.split(sql)
    .getNonEmpty()
    .map((query) => query.sql.trim())
    .filter((statement) => statement.length > 0)
    .map((statement) => ({ sql: statement, parsed: parseKnownDdlStatement(statement) }));
}

function createTableDefinition(parsed: ReturnType<typeof SqlParser.parse>, statement: string): TableDefinition | undefined {
  if (!(parsed instanceof CreateTableQuery)) {
    return undefined;
  }

  const schema = parsed.namespaces?.[0] ? normalizeIdentifier(parsed.namespaces[0]) : 'public';
  const table = normalizeIdentifier(parsed.tableName.name);
  return {
    key: `${schema}.${table}`,
    schema,
    table,
    statement,
    normalizedStatement: normalizeSql(statement),
    columns: parseColumns(parsed),
  };
}

function parseColumns(table: CreateTableQuery): Map<string, ParsedColumn> {
  const columns = new Map<string, ParsedColumn>();
  const tablePrimaryKeys = new Set(
    table.tableConstraints
      .filter((constraint) => constraint.kind === 'primary-key')
      .flatMap((constraint) => constraint.columns?.map((column) => normalizeIdentifier(column.name)) ?? [])
  );

  for (const column of table.columns) {
    const name = normalizeIdentifier(column.name.name);
    const nullable = !tablePrimaryKeys.has(name)
      && !column.constraints.some((constraint) => constraint.kind === 'not-null' || constraint.kind === 'primary-key');
    columns.set(name, { name, type: getColumnTypeName(column), nullable });
  }

  return columns;
}

function buildSummary(localModel: ParsedSchemaModel, remoteModel: ParsedSchemaModel): DdlDiffSummaryEntry[] {
  const entries: DdlDiffSummaryEntry[] = [];
  const remoteSchemas = collectKnownSchemas(remoteModel);

  for (const statement of localModel.createSchemaStatements) {
    const schemaName = extractCreatedSchemaName(statement);
    if (schemaName && !remoteSchemas.has(schemaName)) {
      entries.push({ schema: schemaName, table: '(schema)', changeKind: 'schema_change', details: { message: `create schema ${schemaName}` } });
    }
  }

  for (const [key, localTable] of localModel.tableDefinitions.entries()) {
    const remoteTable = remoteModel.tableDefinitions.get(key);
    if (!remoteTable) {
      entries.push({ schema: localTable.schema, table: localTable.table, changeKind: 'create_table', details: {} });
      continue;
    }
    entries.push(...buildTableChangeSummary(localTable, remoteTable));
  }

  for (const [key, remoteTable] of remoteModel.tableDefinitions.entries()) {
    if (!localModel.tableDefinitions.has(key)) {
      entries.push({ schema: remoteTable.schema, table: remoteTable.table, changeKind: 'drop_table', details: {} });
    }
  }

  return sortSummaryEntries(entries);
}

function buildTableChangeSummary(localTable: TableDefinition, remoteTable: TableDefinition): DdlDiffSummaryEntry[] {
  const entries: DdlDiffSummaryEntry[] = [];

  for (const [columnName, localColumn] of localTable.columns.entries()) {
    const remoteColumn = remoteTable.columns.get(columnName);
    if (!remoteColumn) {
      entries.push({
        schema: localTable.schema,
        table: localTable.table,
        changeKind: 'add_column',
        details: { column: localColumn.name, type: localColumn.type, nullable: localColumn.nullable },
      });
      continue;
    }
    if (normalizeSql(localColumn.type) !== normalizeSql(remoteColumn.type)) {
      entries.push({
        schema: localTable.schema,
        table: localTable.table,
        changeKind: 'alter_type',
        details: { column: localColumn.name, from: remoteColumn.type, to: localColumn.type },
      });
    }
    if (localColumn.nullable !== remoteColumn.nullable) {
      entries.push({
        schema: localTable.schema,
        table: localTable.table,
        changeKind: 'alter_nullability',
        details: {
          column: localColumn.name,
          from: remoteColumn.nullable ? 'nullable' : 'not-null',
          to: localColumn.nullable ? 'nullable' : 'not-null',
        },
      });
    }
  }

  for (const [columnName, remoteColumn] of remoteTable.columns.entries()) {
    if (!localTable.columns.has(columnName)) {
      entries.push({
        schema: localTable.schema,
        table: localTable.table,
        changeKind: 'drop_column',
        details: { column: remoteColumn.name, type: remoteColumn.type },
      });
    }
  }

  if (entries.length === 0 && localTable.normalizedStatement !== remoteTable.normalizedStatement) {
    entries.push({
      schema: localTable.schema,
      table: localTable.table,
      changeKind: 'table_rebuild',
      details: { message: `${localTable.key} changed outside the parsed column set` },
    });
  }

  return entries;
}

function collectKnownSchemas(model: ParsedSchemaModel): Set<string> {
  const schemas = new Set<string>();
  for (const statement of model.createSchemaStatements) {
    const schemaName = extractCreatedSchemaName(statement);
    if (schemaName) {
      schemas.add(schemaName);
    }
  }
  for (const table of model.tableDefinitions.values()) {
    schemas.add(table.schema);
  }
  return schemas;
}

function extractCreatedSchemaName(statement: string): string | undefined {
  const parsed = parseKnownDdlStatement(statement);
  return parsed instanceof CreateSchemaStatement ? normalizeQualifiedName(parsed.schemaName) : undefined;
}

function groupSummaryByTable(summary: DdlDiffSummaryEntry[]): Map<string, DdlDiffSummaryEntry[]> {
  const grouped = new Map<string, DdlDiffSummaryEntry[]>();
  for (const entry of summary) {
    const key = `${entry.schema}.${entry.table}`;
    const bucket = grouped.get(key) ?? [];
    bucket.push(entry);
    grouped.set(key, bucket);
  }
  return grouped;
}

function sortSummaryEntries(entries: DdlDiffSummaryEntry[]): DdlDiffSummaryEntry[] {
  return [...entries].sort((left, right) => {
    const leftKey = `${left.schema}.${left.table}.${left.changeKind}.${String(left.details.column ?? '')}`;
    const rightKey = `${right.schema}.${right.table}.${right.changeKind}.${String(right.details.column ?? '')}`;
    return leftKey.localeCompare(rightKey);
  });
}

function normalizeIdentifier(value: string): string {
  return value.replace(/^"/, '').replace(/"$/, '');
}

function normalizeSql(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function quoteQualifiedName(schema: string, table: string): string {
  return `"${schema}"."${table}"`;
}

function parseKnownDdlStatement(statement: string): ReturnType<typeof SqlParser.parse> {
  try {
    return SqlParser.parse(statement);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new AshibaDdlDiffError({
      code: 'ASHIBA_DDL_DIFF_AST_PARSE_FAILED',
      message: 'DDL AST parse failed while reading migration diff metadata.',
      operation: 'reading migration diff metadata',
      reason,
    });
  }
}

function getColumnTypeName(column: TableColumnDefinition): string {
  if (column.dataType instanceof TypeValue) return column.dataType.getTypeName();
  if (column.dataType instanceof RawString) return normalizeSql(column.dataType.value);
  return 'unknown';
}

function normalizeQualifiedName(value: { namespaces: Array<{ name: string }> | null; name: { name?: string; value?: string } }): string {
  const name = value.name.name ?? value.name.value ?? '';
  return [...(value.namespaces?.map((namespace) => namespace.name) ?? []), name]
    .map(normalizeIdentifier)
    .join('.');
}
