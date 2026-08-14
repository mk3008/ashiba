import {
  BinarySelectQuery,
  ColumnReference,
  SimpleSelectQuery,
  SqlFormatter,
  SqlParser,
  type SelectItem,
  type ValueComponent,
} from 'rawsql-ts';
import { astParseUserError } from '../errors.js';

export interface SqlSafeSortMetadata {
  insertion:
    | {
      status: 'ready';
      index: number;
      end?: number;
      mode: 'order-by' | 'prepend-comma' | 'comma' | 'replace';
    }
    | {
      status: 'unresolved';
      reason: string;
    };
  sortable: Record<string, { sql: string; defaultDirection: 'asc' | 'desc'; allowedDirections: readonly ('asc' | 'desc')[] }>;
}

const sqlFormatter = new SqlFormatter({ keywordCase: 'lower' });

export function buildSqlSafeSortMetadata(sql: string): SqlSafeSortMetadata {
  const parsed = parseSqlForSafeSort(sql);
  const selectIndex = findTopLevelKeyword(sql, 'select');
  if (selectIndex < 0 || !(parsed instanceof SimpleSelectQuery || parsed instanceof BinarySelectQuery)) {
    return {
      insertion: {
        status: 'unresolved',
        reason: 'Safe sort metadata requires a SELECT query.',
      },
      sortable: {},
    };
  }

  if (parsed instanceof BinarySelectQuery) {
    return {
      insertion: {
        status: 'unresolved',
        reason: 'Root compound SELECT safe sort is not supported. Wrap the compound query in a subquery and expose stable sortable columns.',
      },
      sortable: {},
    };
  }

  const orderByIndex = findTopLevelPhrase(sql, ['order', 'by'], selectIndex + 'select'.length);
  if (orderByIndex < 0) {
    return {
      insertion: {
        status: 'unresolved',
        reason: 'Safe sort selection requires reviewed top-level ORDER BY terms in the source SQL.',
      },
      sortable: {},
    };
  }
  const listStart = findOrderByListStart(sql, orderByIndex);
  const listEnd = findFirstTopLevelKeyword(sql, ['limit', 'offset', 'fetch', 'for'], listStart)
    ?? findStatementEnd(sql, listStart);
  const sortable = extractSortableOrderByItems(sql.slice(listStart, listEnd), parsed);
  const insertion = Object.keys(sortable).length > 0
    ? { status: 'ready' as const, index: listStart, end: listEnd, mode: 'replace' as const }
    : {
      status: 'unresolved' as const,
      reason: 'Source SQL ORDER BY terms could not be mapped to stable public sort keys.',
    };

  return {
    insertion,
    sortable,
  };
}

function parseSqlForSafeSort(sql: string): ReturnType<typeof SqlParser.parse> {
  try {
    return SqlParser.parse(sql);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw astParseUserError({
      code: 'ASHIBA_SAFE_SORT_SQL_AST_PARSE_FAILED',
      message: 'SQL AST parse failed while building safe-sort metadata.',
      reason,
      sqlKind: 'SQL',
      operation: 'building safe-sort metadata',
    });
  }
}

function extractSortableSelectItems(query: SimpleSelectQuery): Array<{ name: string; sql: string }> {
  const sortable: Array<{ name: string; sql: string }> = [];
  for (const item of query.selectClause.items) {
    const sortableItem = parseSortableSelectItem(item);
    if (sortableItem) {
      sortable.push(sortableItem);
    }
  }
  return sortable;
}

function extractSortableOrderByItems(
  orderBySql: string,
  query: SimpleSelectQuery,
): SqlSafeSortMetadata['sortable'] {
  const selectItems = extractSortableSelectItems(query);
  const byName = new Map(selectItems.map((item) => [item.name.toLowerCase(), item]));
  const byExpression = new Map(selectItems.map((item) => [normalizeComparableSql(item.sql), item]));
  const sortable: SqlSafeSortMetadata['sortable'] = {};
  for (const term of splitTopLevelCommaList(orderBySql)) {
    const parsed = parseOrderByTerm(term);
    if (!parsed) continue;
    const simpleName = /^[A-Za-z_][A-Za-z0-9_$]*$/.test(parsed.expression)
      ? normalizeIdentifier(parsed.expression)
      : undefined;
    const selected = (simpleName ? byName.get(simpleName.toLowerCase()) : undefined)
      ?? byExpression.get(normalizeComparableSql(parsed.expression));
    const plainColumnName = parsed.expression.match(/(?:^|\.)([A-Za-z_][A-Za-z0-9_$]*)$/)?.[1];
    const key = selected?.name ?? plainColumnName;
    if (!key || sortable[key]) continue;
    sortable[key] = {
      sql: parsed.expression,
      defaultDirection: parsed.direction,
      allowedDirections: [parsed.direction],
    };
  }
  return sortable;
}

function parseOrderByTerm(term: string): { expression: string; direction: 'asc' | 'desc' } | undefined {
  let value = term.trim();
  if (!value) return undefined;
  if (/\s+nulls\s+(?:first|last)\s*$/i.test(value)) return undefined;
  const directionMatch = value.match(/\s+(asc|desc)\s*$/i);
  const direction = directionMatch?.[1]?.toLowerCase() === 'desc' ? 'desc' : 'asc';
  const expression = directionMatch ? value.slice(0, directionMatch.index).trim() : value;
  return expression ? { expression, direction } : undefined;
}

function splitTopLevelCommaList(value: string): string[] {
  const parts: string[] = [];
  let start = 0;
  let depth = 0;
  let quote: '"' | "'" | undefined;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    const next = value[index + 1];
    if (quote) {
      if (char === quote && next === quote) index += 1;
      else if (char === quote) quote = undefined;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '(') depth += 1;
    else if (char === ')' && depth > 0) depth -= 1;
    else if (char === ',' && depth === 0) {
      parts.push(value.slice(start, index));
      start = index + 1;
    }
  }
  parts.push(value.slice(start));
  return parts;
}

function normalizeComparableSql(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

function parseSortableSelectItem(item: SelectItem): { name: string; sql: string } | null {
  if (item.value instanceof ColumnReference && item.value.column.name === '*') {
    return null;
  }

  const name = item.identifier
    ? normalizeIdentifier(item.identifier.name)
    : item.value instanceof ColumnReference
      ? normalizeIdentifier(item.value.column.name)
      : undefined;
  if (!name || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) return null;
  return { name, sql: formatValueComponent(item.value) };
}

function formatValueComponent(value: ValueComponent): string {
  return sqlFormatter.format(value).formattedSql.replace(/"([A-Za-z_][A-Za-z0-9_$]*)"/g, '$1');
}

function findOrderByListStart(sql: string, orderByIndex: number): number {
  let index = orderByIndex + 'order'.length;
  while (/\s/.test(sql[index] ?? '')) index += 1;
  if (sql.slice(index, index + 'by'.length).toLowerCase() === 'by') {
    index += 'by'.length;
  }
  while (/\s/.test(sql[index] ?? '')) index += 1;
  return index;
}

function findFirstTopLevelKeyword(sql: string, keywords: string[], start: number): number | undefined {
  const matches = keywords
    .map((keyword) => findTopLevelKeyword(sql, keyword, start))
    .filter((index) => index >= 0)
    .sort((left, right) => left - right);
  return matches[0];
}

function normalizeIdentifier(value: string): string {
  return value.trim().replace(/^"/, '').replace(/"$/, '');
}

function findStatementEnd(sql: string, start: number): number {
  let quote: '"' | "'" | undefined;
  let quoteBackslashEscapes = false;
  let dollarTag: string | undefined;
  let parenDepth = 0;
  let lineComment = false;
  let blockComment = false;
  for (let index = start; index < sql.length; index += 1) {
    const char = sql[index] ?? '';
    const next = sql[index + 1] ?? '';
    if (dollarTag) {
      if (sql.startsWith(dollarTag, index)) {
        index += dollarTag.length - 1;
        dollarTag = undefined;
      }
      continue;
    }
    if (lineComment) {
      if (char === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === '*' && next === '/') {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (quoteBackslashEscapes && char === '\\' && next) {
        index += 1;
      } else if (char === quote) {
        if (next === quote) {
          index += 1;
        } else {
          quoteBackslashEscapes = false;
          quote = undefined;
        }
      }
      continue;
    }
    if (char === '-' && next === '-') {
      lineComment = true;
      index += 1;
      continue;
    }
    if (char === '/' && next === '*') {
      blockComment = true;
      index += 1;
      continue;
    }
    const dollarMatch = sql.slice(index).match(/^\$[A-Za-z0-9_]*\$/);
    if (dollarMatch) {
      dollarTag = dollarMatch[0];
      index += dollarTag.length - 1;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      quoteBackslashEscapes = char === "'" && isPostgresEscapeStringStart(sql, index);
      continue;
    }
    if (char === '(') parenDepth += 1;
    if (char === ')' && parenDepth > 0) parenDepth -= 1;
    if (char === ';' && parenDepth === 0) {
      return index;
    }
  }
  return sql.length;
}

function findTopLevelPhrase(sql: string, phrase: string[], start = 0): number {
  let cursor = start;
  while (cursor < sql.length) {
    const first = findTopLevelKeyword(sql, phrase[0] ?? '', cursor);
    if (first < 0) return -1;
    let nextStart = first + phrase[0].length;
    let matched = true;
    for (const word of phrase.slice(1)) {
      while (/\s/.test(sql[nextStart] ?? '')) nextStart += 1;
      if (!isKeywordAt(sql, word, nextStart)) {
        matched = false;
        break;
      }
      nextStart += word.length;
    }
    if (matched) return first;
    cursor = first + phrase[0].length;
  }
  return -1;
}

function findTopLevelKeyword(sql: string, keyword: string, start = 0): number {
  let quote: '"' | "'" | undefined;
  let quoteBackslashEscapes = false;
  let dollarTag: string | undefined;
  let parenDepth = 0;
  let lineComment = false;
  let blockComment = false;

  for (let index = start; index < sql.length; index += 1) {
    const char = sql[index] ?? '';
    const next = sql[index + 1] ?? '';
    if (dollarTag) {
      if (sql.startsWith(dollarTag, index)) {
        index += dollarTag.length - 1;
        dollarTag = undefined;
      }
      continue;
    }
    if (lineComment) {
      if (char === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === '*' && next === '/') {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (quoteBackslashEscapes && char === '\\' && next) {
        index += 1;
      } else if (char === quote) {
        if (next === quote) {
          index += 1;
        } else {
          quoteBackslashEscapes = false;
          quote = undefined;
        }
      }
      continue;
    }
    if (char === '-' && next === '-') {
      lineComment = true;
      index += 1;
      continue;
    }
    if (char === '/' && next === '*') {
      blockComment = true;
      index += 1;
      continue;
    }
    const dollarMatch = sql.slice(index).match(/^\$[A-Za-z0-9_]*\$/);
    if (dollarMatch) {
      dollarTag = dollarMatch[0];
      index += dollarTag.length - 1;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      quoteBackslashEscapes = char === "'" && isPostgresEscapeStringStart(sql, index);
      continue;
    }
    if (char === '(') parenDepth += 1;
    if (char === ')' && parenDepth > 0) parenDepth -= 1;
    if (parenDepth === 0 && isKeywordAt(sql, keyword, index)) {
      return index;
    }
  }
  return -1;
}

function isKeywordAt(sql: string, keyword: string, index: number): boolean {
  const before = sql[index - 1] ?? ' ';
  const after = sql[index + keyword.length] ?? ' ';
  return sql.slice(index, index + keyword.length).toLowerCase() === keyword
    && !/[A-Za-z0-9_]/.test(before)
    && !/[A-Za-z0-9_]/.test(after);
}

function isPostgresEscapeStringStart(sql: string, quoteIndex: number): boolean {
  const marker = sql[quoteIndex - 1] ?? '';
  const beforeMarker = sql[quoteIndex - 2] ?? ' ';
  return /e/i.test(marker) && !/[A-Za-z0-9_$]/.test(beforeMarker);
}
