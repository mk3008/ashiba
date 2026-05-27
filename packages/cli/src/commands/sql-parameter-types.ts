import {
  BinaryExpression,
  BinarySelectQuery,
  ColumnReference,
  DeleteQuery,
  InsertQuery,
  ParameterExpression,
  SimpleSelectQuery,
  SqlParser,
  TableSource,
  UpdateQuery,
  ValuesQuery,
  type CommonTable,
  type SelectQuery,
  type SourceExpression,
  type SqlComponent,
  type ValueComponent,
} from 'rawsql-ts';
import type { DdlSchemaColumn, DdlSchemaModel, DdlSchemaTable } from './ddl-schema-model.js';

export interface SqlParameterTypeBinding {
  parameter: string;
  table: string;
  column: string;
  typeName: string;
  typeScriptType: string;
  context: string;
  confidence: 'certain' | 'probable';
}

export interface SqlParameterTypeConflict {
  parameter: string;
  bindings: SqlParameterTypeBinding[];
  typeScriptTypes: string[];
}

export interface SqlParameterTypeInference {
  parameterTypes: Record<string, string>;
  bindings: SqlParameterTypeBinding[];
  conflicts: SqlParameterTypeConflict[];
}

export function inferSqlParameterTypes(sql: string, model: DdlSchemaModel): SqlParameterTypeInference {
  const parsed = SqlParser.parse(sql);
  return inferParsedSqlParameterTypes(parsed, model);
}

export function inferParsedSqlParameterTypes(
  parsed: ReturnType<typeof SqlParser.parse>,
  model: DdlSchemaModel,
): SqlParameterTypeInference {
  const context = buildRelationContext(parsed, model);
  const bindings: SqlParameterTypeBinding[] = [
    ...collectInsertParameterBindings(parsed, model),
    ...collectUpdateSetParameterBindings(parsed, model),
    ...collectPredicateParameterBindings(parsed, context),
  ];
  return buildInference(bindings);
}

export function ddlColumnToTypeScriptType(column: Pick<DdlSchemaColumn, 'typeName' | 'nullable'>): string {
  const type = column.typeName.toLowerCase();
  const base = /^(smallint|integer|int|int2|int4|real|float|float4|float8|double precision|serial|serial2|serial4)$/.test(type)
    ? 'number'
    : /^(bigint|int8|bigserial|serial8|numeric|decimal)$/.test(type)
      ? 'string'
      : /^(boolean|bool)$/.test(type)
        ? 'boolean'
        : 'string';
  return column.nullable ? `${base} | null` : base;
}

export function areTypeScriptTypesCompatible(actual: string, expected: string): boolean {
  const actualNormalized = normalizeTypeScriptType(actual);
  if (actualNormalized === 'unknown') return false;
  return actualNormalized === normalizeTypeScriptType(expected);
}

function collectInsertParameterBindings(
  parsed: ReturnType<typeof SqlParser.parse>,
  model: DdlSchemaModel,
): SqlParameterTypeBinding[] {
  if (!(parsed instanceof InsertQuery) || !(parsed.selectQuery instanceof ValuesQuery)) {
    return [];
  }
  const target = tableTargetFromSource(parsed.insertClause.source);
  const columns = parsed.insertClause.columns?.map((column) => normalizeIdentifier(column.name)) ?? [];
  if (!target || columns.length === 0) {
    return [];
  }
  const table = resolveTable(model, target.schema, target.table);
  if (!table) {
    return [];
  }
  const bindings: SqlParameterTypeBinding[] = [];
  for (const tuple of parsed.selectQuery.tuples) {
    for (const [index, columnName] of columns.entries()) {
      const parameter = parameterName(tuple.values[index]);
      if (!parameter) continue;
      const column = table.columns.get(columnName.toLowerCase());
      if (!column) continue;
      bindings.push(toBinding(parameter, table, column, 'INSERT'));
    }
  }
  return bindings;
}

function collectUpdateSetParameterBindings(
  parsed: ReturnType<typeof SqlParser.parse>,
  model: DdlSchemaModel,
): SqlParameterTypeBinding[] {
  if (!(parsed instanceof UpdateQuery)) {
    return [];
  }
  const target = tableTargetFromSource(parsed.updateClause.source);
  const table = target ? resolveTable(model, target.schema, target.table) : undefined;
  if (!table) {
    return [];
  }
  const bindings: SqlParameterTypeBinding[] = [];
  for (const item of parsed.setClause.items) {
    const parameter = parameterName(item.value);
    if (!parameter) continue;
    const columnName = normalizeIdentifier(item.column.name);
    const column = table.columns.get(columnName.toLowerCase());
    if (!column) continue;
    bindings.push(toBinding(parameter, table, column, 'UPDATE SET'));
  }
  return bindings;
}

function collectPredicateParameterBindings(
  parsed: ReturnType<typeof SqlParser.parse>,
  context: RelationContext,
): SqlParameterTypeBinding[] {
  const bindings: SqlParameterTypeBinding[] = [];
  const collectFromComponent = (component: SqlComponent | ValueComponent | null | undefined, label: string) => {
    if (!component) return;
    collectPredicateBindingsFromValue(component as ValueComponent, context, label, bindings);
  };
  const collectSelect = (selectQuery: SelectQuery) => {
    if (selectQuery instanceof BinarySelectQuery) {
      collectSelect(selectQuery.left);
      collectSelect(selectQuery.right);
      return;
    }
    if (!(selectQuery instanceof SimpleSelectQuery)) return;
    collectFromComponent(selectQuery.whereClause?.condition, 'WHERE');
    collectFromComponent(selectQuery.havingClause?.condition, 'HAVING');
  };
  if (parsed instanceof SimpleSelectQuery || parsed instanceof BinarySelectQuery) {
    collectSelect(parsed);
  } else if (parsed instanceof UpdateQuery) {
    collectFromComponent(parsed.whereClause?.condition, 'WHERE');
  } else if (parsed instanceof DeleteQuery) {
    collectFromComponent(parsed.whereClause?.condition, 'WHERE');
  }
  return bindings;
}

function collectPredicateBindingsFromValue(
  value: ValueComponent,
  context: RelationContext,
  label: string,
  bindings: SqlParameterTypeBinding[],
): void {
  if (!(value instanceof BinaryExpression)) {
    return;
  }

  const operator = String(value.operator.value).toLowerCase();
  if (isComparisonOperator(operator)) {
    collectColumnParameterPair(value.left, value.right, context, label, bindings);
    collectColumnParameterPair(value.right, value.left, context, label, bindings);
  }

  collectPredicateBindingsFromValue(value.left, context, label, bindings);
  collectPredicateBindingsFromValue(value.right, context, label, bindings);
}

function collectColumnParameterPair(
  columnCandidate: ValueComponent,
  parameterCandidate: ValueComponent,
  context: RelationContext,
  label: string,
  bindings: SqlParameterTypeBinding[],
): void {
  if (!(columnCandidate instanceof ColumnReference)) return;
  const parameter = parameterName(parameterCandidate);
  if (!parameter) return;
  const resolved = resolveColumnReference(context, columnCandidate);
  if (!resolved) return;
  bindings.push(toBinding(parameter, resolved.table, resolved.column, label));
}

function buildInference(bindings: SqlParameterTypeBinding[]): SqlParameterTypeInference {
  const byParameter = new Map<string, SqlParameterTypeBinding[]>();
  for (const binding of bindings) {
    const existing = byParameter.get(binding.parameter) ?? [];
    existing.push(binding);
    byParameter.set(binding.parameter, existing);
  }

  const parameterTypes: Record<string, string> = {};
  const conflicts: SqlParameterTypeConflict[] = [];
  for (const [parameter, parameterBindings] of byParameter) {
    const baseTypes = new Set(parameterBindings.map((binding) => baseTypeScriptType(binding.typeScriptType)));
    const typeScriptTypes = [...new Set(parameterBindings.map((binding) => normalizeTypeScriptType(binding.typeScriptType)))].sort();
    if (baseTypes.size > 1) {
      conflicts.push({ parameter, bindings: parameterBindings, typeScriptTypes });
      continue;
    }
    const base = [...baseTypes][0];
    if (!base) continue;
    const nullable = parameterBindings.some((binding) => normalizeTypeScriptType(binding.typeScriptType).includes('null'));
    parameterTypes[parameter] = nullable ? `${base} | null` : base;
  }

  return {
    parameterTypes: Object.fromEntries(Object.entries(parameterTypes).sort(([left], [right]) => left.localeCompare(right))),
    bindings: dedupeBindings(bindings),
    conflicts,
  };
}

interface RelationContext {
  aliasToTable: Map<string, DdlSchemaTable>;
  unambiguousTables: DdlSchemaTable[];
}

function buildRelationContext(parsed: ReturnType<typeof SqlParser.parse>, model: DdlSchemaModel): RelationContext {
  const aliasToTable = new Map<string, DdlSchemaTable>();
  for (const reference of collectTableReferences(parsed)) {
    const table = resolveTable(model, reference.schema, reference.table);
    if (!table) continue;
    aliasToTable.set(reference.alias.toLowerCase(), table);
    aliasToTable.set(reference.table.toLowerCase(), table);
    aliasToTable.set(table.canonicalName.toLowerCase(), table);
  }
  return {
    aliasToTable,
    unambiguousTables: [...new Map([...aliasToTable.values()].map((table) => [table.canonicalName.toLowerCase(), table])).values()],
  };
}

function collectTableReferences(parsed: ReturnType<typeof SqlParser.parse>): Array<{ schema?: string; table: string; alias: string }> {
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
  collectFromQuery(parsed);
  return references;
}

function resolveColumnReference(
  context: RelationContext,
  reference: ColumnReference,
): { table: DdlSchemaTable; column: DdlSchemaColumn } | undefined {
  const columnName = normalizeIdentifier(reference.column.name).toLowerCase();
  const namespace = reference.getNamespace();
  if (namespace) {
    const table = context.aliasToTable.get(normalizeIdentifier(namespace).toLowerCase());
    const column = table?.columns.get(columnName);
    return table && column ? { table, column } : undefined;
  }

  const matches = context.unambiguousTables
    .map((table) => ({ table, column: table.columns.get(columnName) }))
    .filter((entry): entry is { table: DdlSchemaTable; column: DdlSchemaColumn } => Boolean(entry.column));
  return matches.length === 1 ? matches[0] : undefined;
}

function resolveTable(model: DdlSchemaModel, schema: string | undefined, table: string): DdlSchemaTable | undefined {
  if (schema) {
    return model.tables.get(`${schema}.${table}`.toLowerCase());
  }
  const matches = [...model.tables.values()].filter((candidate) => candidate.name.toLowerCase() === table.toLowerCase());
  return matches.length === 1 ? matches[0] : undefined;
}

function tableTargetFromSource(source: SourceExpression | null | undefined): { schema?: string; table: string } | undefined {
  if (!source || !(source.datasource instanceof TableSource)) return undefined;
  const [schema, table] = splitQualifiedName(source.datasource.qualifiedName.toString());
  return { schema, table };
}

function toBinding(
  parameter: string,
  table: DdlSchemaTable,
  column: DdlSchemaColumn,
  context: string,
): SqlParameterTypeBinding {
  return {
    parameter,
    table: table.canonicalName,
    column: column.name,
  typeName: column.typeName,
  typeScriptType: ddlColumnToTypeScriptType(column),
  context,
  confidence: context === 'INSERT' || context === 'UPDATE SET' ? 'certain' : 'probable',
  };
}

function parameterName(value: ValueComponent | undefined): string | undefined {
  if (!(value instanceof ParameterExpression)) return undefined;
  const rawName = value.name?.value ?? (value.index == null ? undefined : String(value.index));
  return rawName ? normalizeIdentifier(String(rawName)) : undefined;
}

function isComparisonOperator(operator: string): boolean {
  return /^(=|<>|!=|<|<=|>|>=|is|is not|like|ilike)$/.test(operator);
}

function dedupeBindings(bindings: SqlParameterTypeBinding[]): SqlParameterTypeBinding[] {
  const seen = new Set<string>();
  return bindings.filter((binding) => {
    const key = [binding.parameter, binding.table, binding.column, binding.typeName, binding.context].join(':');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function baseTypeScriptType(type: string): string {
  return normalizeTypeScriptType(type).replace(/\s*\|\s*null/g, '');
}

function normalizeTypeScriptType(type: string): string {
  return type.replace(/\s+/g, ' ').trim();
}

function splitQualifiedName(value: string): [string | undefined, string] {
  const segments = splitUnquotedQualifiedSegments(value).map((segment) => normalizeIdentifier(segment));
  if (segments.length <= 1) {
    return [undefined, segments[0] ?? ''];
  }
  return [segments[segments.length - 2], segments[segments.length - 1] ?? ''];
}

function normalizeIdentifier(value: string): string {
  return value.trim().replace(/^"/, '').replace(/"$/, '');
}

function splitUnquotedQualifiedSegments(value: string): string[] {
  const parts: string[] = [];
  let current = '';
  let quoted = false;
  for (const char of value) {
    if (char === '"') {
      quoted = !quoted;
    }
    if (char === '.' && !quoted) {
      parts.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  parts.push(current);
  return parts;
}
