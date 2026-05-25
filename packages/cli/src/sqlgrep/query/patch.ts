import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createTwoFilesPatch } from 'diff';
import {
  BinarySelectQuery,
  CommonTable,
  DeleteQuery,
  InsertQuery,
  SimpleSelectQuery,
  SqlFormatter,
  SqlParser,
  UpdateQuery,
  ValuesQuery,
  WithClause
} from 'rawsql-ts';
import { assertSupportedStatement, type SupportedStatement } from './analysis.js';
import { invalidCliInputError } from '../../errors.js';

export interface QueryPatchApplyOptions {
  cte: string;
  from: string;
  out?: string;
  preview?: boolean;
}

export interface QueryPatchApplyReport {
  file: string;
  edited_file: string;
  target_cte: string;
  preview: boolean;
  changed: boolean;
  written: boolean;
  output_file: string;
  updated_sql: string;
  diff: string;
}

/**
 * Replace one CTE in the original SQL with the matching edited CTE definition.
 */
export function applyQueryPatch(sqlFile: string, options: QueryPatchApplyOptions): QueryPatchApplyReport {
  const targetCte = normalizeTargetCte(options.cte);
  const absoluteOriginalPath = path.resolve(sqlFile);
  const absoluteEditedPath = path.resolve(options.from);
  const outputFile = path.resolve(options.out ?? absoluteOriginalPath);
  const originalSql = readFileSync(absoluteOriginalPath, 'utf8');
  const editedSql = readFileSync(absoluteEditedPath, 'utf8');

  const originalStatement = assertSupportedStatement(SqlParser.parse(originalSql), 'ashiba query patch apply');
  const originalWithClause = requireWithClause(originalStatement, absoluteOriginalPath);
  const replacement = extractReplacementCte(editedSql, targetCte, absoluteEditedPath);
  const targetIndex = findExactlyOneCteIndex(originalWithClause, targetCte, absoluteOriginalPath);

  // Replace only the requested CTE while preserving the original WITH clause order.
  originalWithClause.tables.splice(targetIndex, 1, replacement);

  const formatter = new SqlFormatter();
  const updatedSql = `${formatter.format(originalStatement).formattedSql}\n`;

  // Re-parse the emitted SQL so syntax errors fail before any file write happens.
  assertSupportedStatement(SqlParser.parse(updatedSql), 'ashiba query patch apply');

  const diff = createPatch(
    absoluteOriginalPath,
    outputFile,
    originalSql,
    updatedSql
  );
  const changed = normalizeLineEndings(originalSql) !== normalizeLineEndings(updatedSql);
  const preview = Boolean(options.preview);

  if (!preview) {
    ensureDirectory(path.dirname(outputFile));
    writeFileSync(outputFile, updatedSql, 'utf8');
  }

  return {
    file: absoluteOriginalPath,
    edited_file: absoluteEditedPath,
    target_cte: targetCte,
    preview,
    changed,
    written: !preview,
    output_file: outputFile,
    updated_sql: updatedSql,
    diff
  };
}

function normalizeTargetCte(value: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw invalidCliInputError(
      'ASHIBA_QUERY_PATCH_CTE_REQUIRED',
      'ashiba query patch apply requires --cte <name>.',
      'Pass the CTE name to replace with --cte.',
    );
  }
  return normalized;
}

function extractReplacementCte(sql: string, targetCte: string, sourceFile: string): CommonTable {
  try {
    const parsed = assertSupportedStatement(SqlParser.parse(sql), 'ashiba query patch apply');
    return extractReplacementCteFromStatement(parsed, targetCte, sourceFile);
  } catch (statementError) {
    try {
      const snippet = sql.trim().replace(/;\s*$/, '');
      const parsed = assertSupportedStatement(SqlParser.parse(`with ${snippet} select 1`), 'ashiba query patch apply');
      return extractReplacementCteFromStatement(parsed, targetCte, sourceFile);
    } catch {
      throw invalidCliInputError(
        'ASHIBA_QUERY_PATCH_EDITED_SQL_PARSE_FAILED',
        statementError instanceof Error ? statementError.message : String(statementError),
        'Fix the edited SQL so it is a valid statement or a valid CTE snippet before applying the patch.',
        { targetCte, sourceFile },
      );
    }
  }
}

function extractReplacementCteFromStatement(statement: SupportedStatement, targetCte: string, sourceFile: string): CommonTable {
  const withClause = getWithClause(statement);
  if (!withClause) {
    throw invalidCliInputError(
      'ASHIBA_QUERY_PATCH_EDITED_CTE_MISSING',
      `Edited SQL must include the target CTE "${targetCte}" in a WITH clause.`,
      'Edit the replacement SQL so it includes the target CTE in a WITH clause, or pass a CTE snippet that can be wrapped.',
      { targetCte, sourceFile },
    );
  }

  const targetIndex = findExactlyOneCteIndex(withClause, targetCte, sourceFile);
  return withClause.tables[targetIndex];
}

function requireWithClause(statement: SupportedStatement, sourceFile: string): WithClause {
  const withClause = getWithClause(statement);
  if (!withClause) {
    throw invalidCliInputError(
      'ASHIBA_QUERY_PATCH_WITH_CLAUSE_REQUIRED',
      `SQL file does not contain a WITH clause: ${sourceFile}`,
      'Use query patch apply on SQL that contains CTEs in a WITH clause.',
      { sourceFile },
    );
  }
  return withClause;
}

function findExactlyOneCteIndex(withClause: WithClause, targetCte: string, sourceFile: string): number {
  const matches = withClause.tables
    .map((cte: CommonTable, index: number) => ({ cte, index }))
    .filter((entry) => entry.cte.aliasExpression.table.name.toLowerCase() === targetCte.toLowerCase());

  if (matches.length === 0) {
    throw invalidCliInputError(
      'ASHIBA_QUERY_PATCH_CTE_NOT_FOUND',
      `CTE "${targetCte}" was not found in ${sourceFile}.`,
      'Run query outline to inspect available CTE names, then rerun with the exact target CTE.',
      { targetCte, sourceFile },
    );
  }
  if (matches.length > 1) {
    throw invalidCliInputError(
      'ASHIBA_QUERY_PATCH_CTE_NOT_UNIQUE',
      `CTE "${targetCte}" appears multiple times in ${sourceFile}; patch apply requires a unique target.`,
      'Rename or rewrite the SQL so the target CTE name is unique before applying a patch.',
      { targetCte, sourceFile },
    );
  }

  return matches[0].index;
}

function createPatch(originalFile: string, outputFile: string, before: string, after: string): string {
  return createTwoFilesPatch(
    normalizePath(originalFile),
    normalizePath(outputFile),
    normalizeLineEndings(before),
    normalizeLineEndings(after),
    '',
    '',
    { context: 3 }
  );
}

function normalizeLineEndings(value: string): string {
  return value.replace(/\r\n/g, '\n');
}

function normalizePath(value: string): string {
  return value.split(path.sep).join('/');
}

function ensureDirectory(directory: string): void {
  mkdirSync(directory, { recursive: true });
}

function getWithClause(statement: SupportedStatement): WithClause | null {
  if (
    statement instanceof SimpleSelectQuery ||
    statement instanceof ValuesQuery ||
    statement instanceof UpdateQuery ||
    statement instanceof DeleteQuery
  ) {
    return statement.withClause ?? null;
  }

  if (statement instanceof InsertQuery) {
    return statement.selectQuery ? getSelectWithClause(assertSelectStatement(statement.selectQuery)) : null;
  }

  return getSelectWithClause(statement);
}

function getSelectWithClause(statement: SimpleSelectQuery | BinarySelectQuery | ValuesQuery): WithClause | null {
  if (statement instanceof SimpleSelectQuery || statement instanceof ValuesQuery) {
    return statement.withClause ?? null;
  }

  let current: BinarySelectQuery | SimpleSelectQuery | ValuesQuery = statement;
  while (current instanceof BinarySelectQuery) {
    if (current.left instanceof BinarySelectQuery) {
      current = current.left;
      continue;
    }

    if (current.left instanceof SimpleSelectQuery || current.left instanceof ValuesQuery) {
      return current.left.withClause ?? null;
    }

    break;
  }

  return null;
}

function assertSelectStatement(statement: unknown): SimpleSelectQuery | BinarySelectQuery | ValuesQuery {
  if (
    statement instanceof SimpleSelectQuery ||
    statement instanceof BinarySelectQuery ||
    statement instanceof ValuesQuery
  ) {
    return statement;
  }

  throw invalidCliInputError(
    'ASHIBA_QUERY_PATCH_SELECT_EXPECTED',
    'Expected a SELECT-compatible statement.',
    'Use query patch apply with a SELECT-compatible statement or CTE snippet.',
  );
}
