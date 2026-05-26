import {
  BinarySelectQuery,
  ColumnReference,
  DeleteQuery,
  FunctionCall,
  InsertQuery,
  SimpleSelectQuery,
  SqlFormatter,
  SqlParser,
  UpdateQuery,
  type SelectItem,
  type ValueComponent,
} from 'rawsql-ts';
import { inferSqlExpressionContractType, type SqlExpressionContractType } from './sql-expression-type.js';
import { astParseUserError } from '../errors.js';

export type SqlResultColumnContract = {
  name: string;
  type: SqlExpressionContractType;
  expression?: string;
};

export type SqlResultColumnAstItem = {
  name: string;
  value: ValueComponent;
  expression: string;
};

const sqlFormatter = new SqlFormatter({ keywordCase: 'lower' });

export function extractSqlResultColumns(sql: string): string[] {
  return extractSqlResultColumnContracts(sql).map((column) => column.name);
}

export function extractSqlResultColumnContracts(sql: string): SqlResultColumnContract[] {
  const byName = new Map<string, SqlResultColumnContract>();
  for (const column of extractSqlResultColumnContractsFromAst(sql)) {
    byName.set(column.name, column);
  }

  return [...byName.values()].sort((left, right) => left.name.localeCompare(right.name));
}

function extractSqlResultColumnContractsFromAst(sql: string): SqlResultColumnContract[] {
  return extractSqlResultColumnAstItems(sql).map((item) => ({
    name: item.name,
    type: inferSqlExpressionContractType(item.value),
    expression: item.expression,
  }));
}

export function extractSqlResultColumnAstItems(sql: string): SqlResultColumnAstItem[] {
  let parsed: ReturnType<typeof SqlParser.parse>;
  try {
    parsed = SqlParser.parse(sql);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw astParseUserError({
      code: 'ASHIBA_RESULT_COLUMNS_SQL_AST_PARSE_FAILED',
      message: 'SQL AST parse failed while extracting result columns.',
      reason,
      sqlKind: 'SQL',
      operation: 'extracting result columns',
    });
  }

  return extractResultItems(parsed)
    .map(parseSqlResultColumnAstItem)
    .filter((column): column is SqlResultColumnAstItem => Boolean(column));
}

function extractResultItems(query: unknown): SelectItem[] {
  if (query instanceof SimpleSelectQuery) {
    return query.selectClause.items;
  }
  if (query instanceof BinarySelectQuery) {
    return extractResultItems(query.left);
  }
  if (query instanceof InsertQuery || query instanceof UpdateQuery || query instanceof DeleteQuery) {
    return query.returningClause?.items ?? [];
  }
  return [];
}

function parseSqlResultColumnAstItem(item: SelectItem): SqlResultColumnAstItem | undefined {
  if (item.value instanceof ColumnReference && item.value.column.name === '*') {
    return undefined;
  }

  const name = inferResultColumnName(item);
  if (!name) {
    return undefined;
  }

  const expression = formatValueComponent(item.value);
  return {
    name,
    value: item.value,
    expression,
  };
}

function inferResultColumnName(item: SelectItem): string | undefined {
  if (item.identifier) {
    return normalizeIdentifier(item.identifier.name);
  }
  if (item.value instanceof ColumnReference) {
    return normalizeIdentifier(item.value.column.name);
  }
  if (item.value instanceof FunctionCall) {
    return normalizeIdentifier(item.value.qualifiedName.name.toString());
  }
  return undefined;
}

function formatValueComponent(value: ValueComponent): string {
  return sqlFormatter.format(value).formattedSql.replace(/"([A-Za-z_][A-Za-z0-9_$]*)"/g, '$1');
}

function normalizeIdentifier(value: string): string {
  return value.trim().replace(/^"/, '').replace(/"$/, '');
}
