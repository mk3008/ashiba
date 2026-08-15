import {
  BinaryExpression,
  CaseExpression,
  CastExpression,
  ColumnReference,
  FunctionCall,
  LiteralValue,
  ParenExpression,
  RawString,
  TypeValue,
  UnaryExpression,
  ValueList,
  type ValueComponent,
} from 'rawsql-ts';

export type SqlExpressionContractType =
  | 'unknown'
  | 'string'
  | 'number'
  | 'boolean'
  | 'null'
  | 'string[]'
  | 'number[]'
  | 'boolean[]';

export type DdlColumnTypeResolver = (reference: ColumnReference) => string | undefined;
export type SqlExpressionNullability = 'non-null' | 'nullable' | 'unknown';
export type DdlColumnNullabilityResolver = (reference: ColumnReference) => boolean | undefined;

export function inferSqlExpressionContractType(
  expression: ValueComponent,
  options: { resolveColumnType?: DdlColumnTypeResolver } = {},
): SqlExpressionContractType {
  if (expression instanceof LiteralValue) {
    return inferLiteralType(expression);
  }

  if (expression instanceof RawString) {
    const value = expression.value.toLowerCase();
    if (value === 'null') return 'null';
    if (value === 'true' || value === 'false') return 'boolean';
    return 'unknown';
  }

  if (expression instanceof ColumnReference) {
    const typeName = options.resolveColumnType?.(expression);
    return typeName ? mapSqlTypeToContractType(typeName) : 'unknown';
  }

  if (expression instanceof ParenExpression) {
    return inferSqlExpressionContractType(expression.expression, options);
  }

  if (expression instanceof CastExpression) {
    return mapSqlTypeToContractType(expression.castType.getTypeName());
  }

  if (expression instanceof UnaryExpression) {
    const operator = expression.operator.value.toLowerCase();
    const innerType = inferSqlExpressionContractType(expression.expression, options);
    if ((operator === '+' || operator === '-') && innerType === 'number') return 'number';
    if (operator === 'not') return 'boolean';
    return innerType;
  }

  if (expression instanceof BinaryExpression) {
    return inferBinaryExpressionType(expression, options);
  }

  if (expression instanceof FunctionCall) {
    return inferFunctionCallType(expression, options);
  }

  if (expression instanceof CaseExpression) {
    return inferCaseExpressionType(expression, options);
  }

  return 'unknown';
}

/**
 * Infer only nullability facts that are visible in SQL or resolved DDL.
 * Unknown expressions stay unknown instead of being promoted to non-null.
 */
export function inferSqlExpressionNullability(
  expression: ValueComponent,
  options: { resolveColumnNullability?: DdlColumnNullabilityResolver } = {},
): SqlExpressionNullability {
  if (expression instanceof LiteralValue) return expression.value === null ? 'nullable' : 'non-null';
  if (expression instanceof RawString) {
    const value = expression.value.toLowerCase();
    if (value === 'null') return 'nullable';
    if (value === 'true' || value === 'false') return 'non-null';
    return 'unknown';
  }
  if (expression instanceof ColumnReference) {
    const nullable = options.resolveColumnNullability?.(expression);
    return nullable === undefined ? 'unknown' : nullable ? 'nullable' : 'non-null';
  }
  if (expression instanceof ParenExpression) {
    return inferSqlExpressionNullability(expression.expression, options);
  }
  if (expression instanceof CastExpression) {
    return inferSqlExpressionNullability(expression.input, options);
  }
  if (expression instanceof UnaryExpression) {
    return inferSqlExpressionNullability(expression.expression, options);
  }
  if (expression instanceof BinaryExpression) {
    const operator = expression.operator.value.toLowerCase();
    if (operator === 'is' || operator === 'is not') return 'non-null';
    return combineNullability([
      inferSqlExpressionNullability(expression.left, options),
      inferSqlExpressionNullability(expression.right, options),
    ]);
  }
  if (expression instanceof FunctionCall) {
    const functionName = getSqlName(expression.qualifiedName.name).toLowerCase();
    const args = expression.argument instanceof ValueList
      ? expression.argument.values
      : expression.argument
        ? [expression.argument]
        : [];
    if (functionName === 'count') return 'non-null';
    if (/^(?:json_build_object|jsonb_build_object|json_build_array|jsonb_build_array)$/.test(functionName)) {
      return 'non-null';
    }
    if (/^(?:sum|avg|min|max|array_agg|string_agg|json_agg|jsonb_agg)$/.test(functionName)) {
      return 'nullable';
    }
    if (functionName === 'nullif') return 'nullable';
    if (functionName === 'coalesce') {
      const states = args.map((arg) => inferSqlExpressionNullability(arg, options));
      if (states.includes('non-null')) return 'non-null';
      return states.length > 0 && states.every((state) => state === 'nullable') ? 'nullable' : 'unknown';
    }
    return args.length > 0
      ? combineNullability(args.map((arg) => inferSqlExpressionNullability(arg, options)))
      : 'unknown';
  }
  if (expression instanceof CaseExpression) {
    const states = expression.switchCase.cases.map((entry) => inferSqlExpressionNullability(entry.value, options));
    states.push(expression.switchCase.elseValue
      ? inferSqlExpressionNullability(expression.switchCase.elseValue, options)
      : 'nullable');
    return combineNullability(states);
  }
  return 'unknown';
}

function combineNullability(states: SqlExpressionNullability[]): SqlExpressionNullability {
  if (states.includes('nullable')) return 'nullable';
  if (states.length > 0 && states.every((state) => state === 'non-null')) return 'non-null';
  return 'unknown';
}

function inferLiteralType(expression: LiteralValue): SqlExpressionContractType {
  if (expression.value === null) return 'null';
  if (typeof expression.value === 'boolean') return 'boolean';
  if (typeof expression.value === 'number') return 'number';
  if (typeof expression.value === 'string' && expression.isStringLiteral === true) return 'string';
  return 'unknown';
}

function inferBinaryExpressionType(
  expression: BinaryExpression,
  options: { resolveColumnType?: DdlColumnTypeResolver },
): SqlExpressionContractType {
  const operator = expression.operator.value.toLowerCase();

  if (isBooleanOperator(operator)) {
    return 'boolean';
  }

  if (operator === 'as' && expression.right instanceof TypeValue) {
    return mapSqlTypeToContractType(expression.right.getTypeName());
  }

  if (operator === '||') {
    const leftType = inferSqlExpressionContractType(expression.left, options);
    const rightType = inferSqlExpressionContractType(expression.right, options);
    return [leftType, rightType].every((type) => type !== 'unknown')
      && [leftType, rightType].some((type) => type === 'string')
      ? 'string'
      : 'unknown';
  }

  if (['+', '-', '*', '/'].includes(operator)) {
    const leftType = inferSqlExpressionContractType(expression.left, options);
    const rightType = inferSqlExpressionContractType(expression.right, options);
    if ([leftType, rightType].every((type) => type === 'number' || type === 'null')) return 'number';
    if ([leftType, rightType].every((type) => type === 'number' || type === 'string' || type === 'null')) return 'string';
    return 'unknown';
  }

  return 'unknown';
}

function inferFunctionCallType(
  expression: FunctionCall,
  options: { resolveColumnType?: DdlColumnTypeResolver },
): SqlExpressionContractType {
  const functionName = getSqlName(expression.qualifiedName.name).toLowerCase();

  if (functionName === 'cast' && expression.argument instanceof BinaryExpression) {
    return inferBinaryExpressionType(expression.argument, options);
  }

  const args = expression.argument instanceof ValueList
    ? expression.argument.values
    : expression.argument
      ? [expression.argument]
      : [];

  if (functionName === 'array_agg') {
    const type = args[0] ? inferSqlExpressionContractType(args[0], options) : 'unknown';
    return toArrayContractType(type);
  }

  if (functionName === 'max' || functionName === 'min') {
    return args[0] ? inferSqlExpressionContractType(args[0], options) : 'unknown';
  }

  if (functionName === 'nullif') {
    return args[0] ? inferSqlExpressionContractType(args[0], options) : 'unknown';
  }

  if (['coalesce', 'greatest', 'least'].includes(functionName)) {
    for (const arg of args) {
      const type = inferSqlExpressionContractType(arg, options);
      if (type !== 'unknown' && type !== 'null') return type;
    }
  }

  const knownType = mapKnownSqlFunctionToContractType(functionName);
  if (knownType !== 'unknown') return knownType;

  return 'unknown';
}

function getSqlName(value: { name?: string; value?: string }): string {
  return value.name ?? value.value ?? '';
}

function inferCaseExpressionType(
  expression: CaseExpression,
  options: { resolveColumnType?: DdlColumnTypeResolver },
): SqlExpressionContractType {
  const branchTypes = [
    ...expression.switchCase.cases.map((entry) => inferSqlExpressionContractType(entry.value, options)),
    ...(expression.switchCase.elseValue ? [inferSqlExpressionContractType(expression.switchCase.elseValue, options)] : []),
  ].filter((type) => type !== 'unknown' && type !== 'null');
  const uniqueTypes = new Set(branchTypes);
  return uniqueTypes.size === 1 ? [...uniqueTypes][0] ?? 'unknown' : 'unknown';
}

function isBooleanOperator(operator: string): boolean {
  return [
    '=',
    '<>',
    '!=',
    '>',
    '<',
    '>=',
    '<=',
    'and',
    'or',
    'like',
    'not like',
    'ilike',
    'not ilike',
    'is',
    'is not',
    'in',
    'not in',
  ].includes(operator);
}

function mapKnownSqlFunctionToContractType(functionName: string): SqlExpressionContractType {
  // PostgreSQL count returns int8; node-postgres preserves int8 as a string by default.
  if (functionName === 'count') return 'string';
  if (/^(?:length|char_length|character_length)$/.test(functionName)) return 'number';
  if (/^(?:lower|upper|trim|ltrim|rtrim|concat|substring|substr)$/.test(functionName)) return 'string';
  if (/^(?:now|current_timestamp|localtimestamp)$/.test(functionName)) return 'string';
  return 'unknown';
}

export function mapSqlTypeToContractType(typeName: string): SqlExpressionContractType {
  const normalized = typeName.toLowerCase().replace(/\([^)]*\)/g, '').trim();
  if (/^(?:string|number|boolean)(?:\[\])?$/.test(normalized)) return normalized as SqlExpressionContractType;
  if (/^(?:text|char|character|varchar|character varying|uuid)\s*\[\]$/.test(normalized)) return 'string[]';
  if (/^(?:bigint|int8|bigserial|serial8|decimal|numeric)\s*\[\]$/.test(normalized)) return 'string[]';
  if (/^(?:smallint|integer|int|int2|int4|serial|serial2|serial4|real|float|float4|float8|double precision)\s*\[\]$/.test(normalized)) return 'number[]';
  if (/^(?:boolean|bool)\s*\[\]$/.test(normalized)) return 'boolean[]';
  if (/^(?:boolean|bool)$/.test(normalized)) return 'boolean';
  if (/^(?:bigint|int8|bigserial|serial8|decimal|numeric)$/.test(normalized)) return 'string';
  if (/^(?:smallint|integer|int|int2|int4|serial|serial2|serial4|real|float|float4|float8|double precision)$/.test(normalized)) return 'number';
  if (/^(?:text|char|character|varchar|character varying|uuid)$/.test(normalized)) return 'string';
  if (/^(?:date|time|time without time zone|time with time zone|timetz|timestamp|timestamp without time zone|timestamp with time zone|timestamptz)$/.test(normalized)) return 'string';
  return 'unknown';
}

function toArrayContractType(type: SqlExpressionContractType): SqlExpressionContractType {
  if (type === 'string') return 'string[]';
  if (type === 'number') return 'number[]';
  if (type === 'boolean') return 'boolean[]';
  return 'unknown';
}
