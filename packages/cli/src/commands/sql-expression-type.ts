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

export type SqlExpressionContractType = 'unknown' | 'string' | 'number' | 'boolean' | 'null';

export type DdlColumnTypeResolver = (reference: ColumnReference) => string | undefined;

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
    return [leftType, rightType].every((type) => type === 'number' || type === 'null')
      ? 'number'
      : 'unknown';
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

  const knownType = mapKnownSqlFunctionToContractType(functionName);
  if (knownType !== 'unknown') return knownType;

  const args = expression.argument instanceof ValueList
    ? expression.argument.values
    : expression.argument
      ? [expression.argument]
      : [];

  if (functionName === 'nullif') {
    return args[0] ? inferSqlExpressionContractType(args[0], options) : 'unknown';
  }

  if (['coalesce', 'greatest', 'least'].includes(functionName)) {
    for (const arg of args) {
      const type = inferSqlExpressionContractType(arg, options);
      if (type !== 'unknown' && type !== 'null') return type;
    }
  }

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
  if (/^(?:count|sum|avg|min|max|length|char_length|character_length)$/.test(functionName)) return 'number';
  if (/^(?:lower|upper|trim|ltrim|rtrim|concat|substring|substr)$/.test(functionName)) return 'string';
  return 'unknown';
}

export function mapSqlTypeToContractType(typeName: string): SqlExpressionContractType {
  const normalized = typeName.toLowerCase().replace(/\([^)]*\)/g, '').trim();
  if (/^(?:boolean|bool)$/.test(normalized)) return 'boolean';
  if (/^(?:smallint|integer|int|int2|int4|bigint|int8|serial|serial2|serial4|bigserial|serial8|decimal|numeric|real|float|float4|float8|double precision)$/.test(normalized)) return 'number';
  if (/^(?:text|char|character|varchar|character varying|uuid)$/.test(normalized)) return 'string';
  return 'unknown';
}
