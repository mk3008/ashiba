import {
  BinaryExpression,
  BinarySelectQuery,
  CastExpression,
  ColumnReference,
  DeleteQuery,
  FunctionCall,
  InsertQuery,
  ParameterExpression,
  ParenExpression,
  SimpleSelectQuery,
  SqlParser,
  UpdateQuery,
  ValueList,
  ValuesQuery,
  type SelectQuery,
  type SqlComponent,
  type ValueComponent,
} from 'rawsql-ts';
import type { DdlSchemaColumn, DdlSchemaModel, DdlSchemaTable } from './ddl-schema-model.js';
import {
  normalizeIdentifier,
  type SchemaPathConfig,
} from './schema-path.js';
import {
  collectTableReferences,
  resolveDdlTable as resolveTable,
  tableTargetFromSource,
} from './table-resolution.js';
import { mapSqlTypeToContractType } from './sql-expression-type.js';

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
  certainParameters: string[];
}

export function inferSqlParameterTypes(
  sql: string,
  model: DdlSchemaModel | undefined,
  schemaPath: Partial<SchemaPathConfig> = model ?? {},
): SqlParameterTypeInference {
  const analyzableSql = maskSqlNonCode(sql);
  const nullableParameters = collectNullableParameters(analyzableSql);
  const declaredParameterTypes = applyDeclaredParameterNullability(
    collectSqlDeclaredParameterTypes(analyzableSql),
    nullableParameters,
  );
  if (!model) {
    return mergeDeclaredParameterTypes(
      { parameterTypes: {}, bindings: [], conflicts: [], certainParameters: [] },
      declaredParameterTypes,
    );
  }
  let parsed: ReturnType<typeof SqlParser.parse>;
  try {
    parsed = SqlParser.parse(sql);
  } catch {
    return mergeDeclaredParameterTypes(
      { parameterTypes: {}, bindings: [], conflicts: [], certainParameters: [] },
      declaredParameterTypes,
    );
  }
  const inferred = inferParsedSqlParameterTypes(parsed, model, schemaPath, nullableParameters);
  return mergeDeclaredParameterTypes(inferred, declaredParameterTypes);
}

export function inferParsedSqlParameterTypes(
  parsed: ReturnType<typeof SqlParser.parse>,
  model: DdlSchemaModel,
  schemaPath: Partial<SchemaPathConfig> = model,
  nullableParameters: ReadonlySet<string> = new Set(),
): SqlParameterTypeInference {
  const context = buildRelationContext(parsed, model, schemaPath);
  const bindings: SqlParameterTypeBinding[] = [
    ...collectInsertParameterBindings(parsed, model, schemaPath),
    ...collectUpdateSetParameterBindings(parsed, model, schemaPath),
    ...collectPredicateParameterBindings(parsed, context),
  ];
  return buildInference(bindings, nullableParameters);
}

export function ddlColumnToTypeScriptType(column: Pick<DdlSchemaColumn, 'typeName' | 'nullable'>): string {
  const normalized = column.typeName.toLowerCase().replace(/\([^)]*\)/g, '').trim();
  const isArray = normalized.endsWith('[]');
  const type = isArray ? normalized.slice(0, -2).trim() : normalized;
  const scalar = /^(smallint|integer|int|int2|int4|real|float|float4|float8|double precision|serial|serial2|serial4)$/.test(type)
    ? 'number'
    : /^(bigint|int8|bigserial|serial8|numeric|decimal)$/.test(type)
      ? 'string'
      : /^(boolean|bool)$/.test(type)
        ? 'boolean'
        : 'string';
  const base = isArray ? `${scalar}[]` : scalar;
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
  schemaPath: Partial<SchemaPathConfig>,
): SqlParameterTypeBinding[] {
  if (!(parsed instanceof InsertQuery) || !(parsed.selectQuery instanceof ValuesQuery)) {
    return [];
  }
  const target = tableTargetFromSource(parsed.insertClause.source);
  const columns = parsed.insertClause.columns?.map((column) => normalizeIdentifier(column.name)) ?? [];
  if (!target || columns.length === 0) {
    return [];
  }
  const table = resolveTable(model, target, schemaPath);
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
  schemaPath: Partial<SchemaPathConfig>,
): SqlParameterTypeBinding[] {
  if (!(parsed instanceof UpdateQuery)) {
    return [];
  }
  const target = tableTargetFromSource(parsed.updateClause.source);
  const table = target ? resolveTable(model, target, schemaPath) : undefined;
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
  if (value instanceof ParenExpression) {
    collectPredicateBindingsFromValue(value.expression, context, label, bindings);
    return;
  }
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
  const columns = collectColumnReferences(columnCandidate);
  const parameters = collectParameterNames(parameterCandidate);
  if (columns.length !== 1 || parameters.length === 0) return;
  const resolved = resolveColumnReference(context, columns[0]);
  if (!resolved) return;
  const transform = isAnyFunction(columnCandidate)
    ? 'element'
    : isAnyFunction(parameterCandidate)
      ? 'array'
      : 'identity';
  for (const parameter of parameters) {
    bindings.push(toBinding(parameter, resolved.table, resolved.column, label, transform));
  }
}

function buildInference(
  bindings: SqlParameterTypeBinding[],
  nullableParameters: ReadonlySet<string> = new Set(),
): SqlParameterTypeInference {
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
    const nullable = nullableParameters.has(parameter)
      || parameterBindings.some((binding) => normalizeTypeScriptType(binding.typeScriptType).includes('null'));
    parameterTypes[parameter] = nullable ? `${base} | null` : base;
  }

  return {
    parameterTypes: Object.fromEntries(Object.entries(parameterTypes).sort(([left], [right]) => left.localeCompare(right))),
    bindings: dedupeBindings(bindings),
    conflicts,
    certainParameters: [...byParameter.entries()]
      .filter(([, parameterBindings]) => parameterBindings.every((binding) => binding.confidence === 'certain'))
      .map(([parameter]) => parameter)
      .sort(),
  };
}

interface RelationContext {
  aliasToTable: Map<string, DdlSchemaTable>;
  unambiguousTables: DdlSchemaTable[];
}

function buildRelationContext(
  parsed: ReturnType<typeof SqlParser.parse>,
  model: DdlSchemaModel,
  schemaPath: Partial<SchemaPathConfig>,
): RelationContext {
  const aliasToTable = new Map<string, DdlSchemaTable>();
  for (const reference of collectTableReferences(parsed)) {
    const table = resolveTable(model, reference, schemaPath);
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

function toBinding(
  parameter: string,
  table: DdlSchemaTable,
  column: DdlSchemaColumn,
  context: string,
  transform: 'identity' | 'array' | 'element' = 'identity',
): SqlParameterTypeBinding {
  const columnType = context === 'INSERT' || context === 'UPDATE SET'
    ? ddlColumnToTypeScriptType(column)
    : ddlColumnToTypeScriptType({ ...column, nullable: false });
  const typeScriptType = transform === 'array'
    ? toArrayType(columnType)
    : transform === 'element'
      ? toElementType(columnType)
      : columnType;
  return {
    parameter,
    table: table.canonicalName,
    column: column.name,
  typeName: column.typeName,
  typeScriptType,
  context,
  confidence: 'certain',
  };
}

function parameterName(value: ValueComponent | undefined): string | undefined {
  if (!(value instanceof ParameterExpression)) return undefined;
  const rawName = value.name?.value ?? (value.index == null ? undefined : String(value.index));
  return rawName ? normalizeIdentifier(String(rawName)) : undefined;
}

function isComparisonOperator(operator: string): boolean {
  return /^(=|<>|!=|<|<=|>|>=|is|is not|like|ilike|in|not in)$/.test(operator);
}

function collectParameterNames(value: ValueComponent): string[] {
  if (value instanceof ParameterExpression) {
    const name = parameterName(value);
    return name ? [name] : [];
  }
  if (value instanceof ParenExpression) return collectParameterNames(value.expression);
  if (value instanceof CastExpression) return collectParameterNames(value.input);
  if (value instanceof BinaryExpression) {
    return [...collectParameterNames(value.left), ...collectParameterNames(value.right)];
  }
  if (value instanceof FunctionCall) {
    const args = value.argument instanceof ValueList ? value.argument.values : value.argument ? [value.argument] : [];
    return args.flatMap(collectParameterNames);
  }
  if (value instanceof ValueList) return value.values.flatMap(collectParameterNames);
  return [];
}

function collectColumnReferences(value: ValueComponent): ColumnReference[] {
  if (value instanceof ColumnReference) return [value];
  if (value instanceof ParenExpression) return collectColumnReferences(value.expression);
  if (value instanceof CastExpression) return collectColumnReferences(value.input);
  if (value instanceof BinaryExpression) {
    return [...collectColumnReferences(value.left), ...collectColumnReferences(value.right)];
  }
  if (value instanceof FunctionCall) {
    const args = value.argument instanceof ValueList ? value.argument.values : value.argument ? [value.argument] : [];
    return args.flatMap(collectColumnReferences);
  }
  if (value instanceof ValueList) return value.values.flatMap(collectColumnReferences);
  return [];
}

function isAnyFunction(value: ValueComponent): boolean {
  const unwrapped = value instanceof ParenExpression ? value.expression : value;
  if (!(unwrapped instanceof FunctionCall)) return false;
  const name = unwrapped.qualifiedName.name;
  const text = 'name' in name ? name.name : name.value;
  return text.toLowerCase() === 'any';
}

function toArrayType(type: string): string {
  const nullable = /\bnull\b/.test(type);
  const base = baseTypeScriptType(type);
  const array = base.endsWith('[]') ? base : `${base}[]`;
  return nullable ? `${array} | null` : array;
}

function toElementType(type: string): string {
  const nullable = /\bnull\b/.test(type);
  const base = baseTypeScriptType(type).replace(/\[\]$/, '');
  return nullable ? `${base} | null` : base;
}

function collectNullableParameters(sql: string): Set<string> {
  const nullable = new Set<string>();
  const patterns = [
    /:([A-Za-z_][A-Za-z0-9_$]*)\s+is\s+(?:not\s+)?null\b/gi,
    /\bcast\s*\(\s*:([A-Za-z_][A-Za-z0-9_$]*)\s+as\s+[A-Za-z_][A-Za-z0-9_ ]*(?:\([^)]*\))?(?:\[\])?\s*\)\s+is\s+(?:not\s+)?null\b/gi,
    /:([A-Za-z_][A-Za-z0-9_$]*)\s*::\s*[A-Za-z_][A-Za-z0-9_ ]*(?:\([^)]*\))?(?:\[\])?\s*\)?\s+is\s+(?:not\s+)?null\b/gi,
  ];
  for (const pattern of patterns) {
    for (const match of sql.matchAll(pattern)) {
      if (match[1]) nullable.add(match[1]);
    }
  }
  return nullable;
}

function maskSqlNonCode(sql: string): string {
  const output = [...sql];
  let quote: "'" | '"' | undefined;
  let quoteBackslashEscapes = false;
  let dollarTag: string | undefined;
  let lineComment = false;
  let blockCommentDepth = 0;
  const mask = (index: number) => {
    if (output[index] !== '\n' && output[index] !== '\r') output[index] = ' ';
  };

  for (let index = 0; index < sql.length; index += 1) {
    const current = sql[index] ?? '';
    const next = sql[index + 1] ?? '';
    if (dollarTag) {
      if (sql.startsWith(dollarTag, index)) {
        for (let offset = 0; offset < dollarTag.length; offset += 1) mask(index + offset);
        index += dollarTag.length - 1;
        dollarTag = undefined;
      } else {
        mask(index);
      }
      continue;
    }
    if (lineComment) {
      if (current === '\n') {
        lineComment = false;
      } else {
        mask(index);
      }
      continue;
    }
    if (blockCommentDepth > 0) {
      mask(index);
      if (current === '/' && next === '*') {
        mask(index + 1);
        blockCommentDepth += 1;
        index += 1;
      } else if (current === '*' && next === '/') {
        mask(index + 1);
        blockCommentDepth -= 1;
        index += 1;
      }
      continue;
    }
    if (quote) {
      mask(index);
      if (quoteBackslashEscapes && current === '\\' && next) {
        mask(index + 1);
        index += 1;
      } else if (current === quote && next === quote) {
        mask(index + 1);
        index += 1;
      } else if (current === quote) {
        quote = undefined;
        quoteBackslashEscapes = false;
      }
      continue;
    }
    if (current === '-' && next === '-') {
      mask(index);
      mask(index + 1);
      lineComment = true;
      index += 1;
      continue;
    }
    if (current === '/' && next === '*') {
      mask(index);
      mask(index + 1);
      blockCommentDepth = 1;
      index += 1;
      continue;
    }
    const dollarMatch = sql.slice(index).match(/^\$[A-Za-z0-9_]*\$/)?.[0];
    if (dollarMatch) {
      for (let offset = 0; offset < dollarMatch.length; offset += 1) mask(index + offset);
      dollarTag = dollarMatch;
      index += dollarMatch.length - 1;
      continue;
    }
    if (current === "'" || current === '"') {
      mask(index);
      quote = current;
      quoteBackslashEscapes = current === "'" && isPostgresEscapeStringStart(sql, index);
    }
  }
  return output.join('');
}

function isPostgresEscapeStringStart(sql: string, quoteIndex: number): boolean {
  const marker = sql[quoteIndex - 1] ?? '';
  const beforeMarker = sql[quoteIndex - 2] ?? ' ';
  return /e/i.test(marker) && !/[A-Za-z0-9_$]/.test(beforeMarker);
}

function applyDeclaredParameterNullability(
  declared: Record<string, string>,
  nullableParameters: ReadonlySet<string>,
): Record<string, string> {
  return Object.fromEntries(Object.entries(declared).map(([name, type]) => [
    name,
    nullableParameters.has(name) && !normalizeTypeScriptType(type).includes('null')
      ? `${type} | null`
      : type,
  ]));
}

function collectSqlDeclaredParameterTypes(sql: string): Record<string, string> {
  const types: Record<string, string> = {};
  const add = (name: string | undefined, sqlType: string | undefined) => {
    if (!name || !sqlType) return;
    const contractType = mapSqlTypeToContractType(sqlType);
    if (contractType !== 'unknown' && contractType !== 'null') types[name] = contractType;
  };
  for (const match of sql.matchAll(/:([A-Za-z_][A-Za-z0-9_$]*)\s*::\s*([A-Za-z_][A-Za-z0-9_ ]*(?:\([^)]*\))?(?:\[\])?)/gi)) {
    add(match[1], match[2]?.trim());
  }
  for (const match of sql.matchAll(/\bcast\s*\(\s*:([A-Za-z_][A-Za-z0-9_$]*)\s+as\s+([A-Za-z_][A-Za-z0-9_ ]*(?:\([^)]*\))?(?:\[\])?)\s*\)/gi)) {
    add(match[1], match[2]?.trim());
  }
  for (const match of sql.matchAll(/\b(?:limit|offset)\s+:([A-Za-z_][A-Za-z0-9_$]*)\b/gi)) {
    if (match[1]) types[match[1]] = 'number';
  }
  for (const match of sql.matchAll(/\bfetch\s+(?:first|next)\s+:([A-Za-z_][A-Za-z0-9_$]*)\s+rows?\b/gi)) {
    if (match[1]) types[match[1]] = 'number';
  }
  return types;
}

function mergeDeclaredParameterTypes(
  inference: SqlParameterTypeInference,
  declared: Record<string, string>,
): SqlParameterTypeInference {
  const parameterTypes = { ...inference.parameterTypes };
  const conflicts = [...inference.conflicts];
  for (const [parameter, declaredType] of Object.entries(declared)) {
    const inferredType = parameterTypes[parameter];
    if (inferredType && baseTypeScriptType(inferredType) !== baseTypeScriptType(declaredType)) {
      conflicts.push({
        parameter,
        bindings: inference.bindings.filter((binding) => binding.parameter === parameter),
        typeScriptTypes: [inferredType, declaredType].sort(),
      });
      delete parameterTypes[parameter];
    } else if (!inferredType) {
      parameterTypes[parameter] = declaredType;
    }
  }
  return {
    parameterTypes: Object.fromEntries(Object.entries(parameterTypes).sort(([left], [right]) => left.localeCompare(right))),
    bindings: inference.bindings,
    conflicts,
    certainParameters: [...new Set([...inference.certainParameters, ...Object.keys(declared)])].sort(),
  };
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
