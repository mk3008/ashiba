import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createTwoFilesPatch } from 'diff';
import {
  collectSupportedOptionalConditionBranches,
  SelectQueryParser,
  SSSQLFilterBuilder as OptionalConditionBuilder,
  type SssqlBranchInfo as OptionalConditionBranchInfo,
  type SssqlBranchKind as OptionalConditionBranchKind,
  type SssqlRemoveSpec as OptionalConditionRemoveSpec,
  type SssqlRewritePlan as OptionalConditionRewritePlan,
  type SssqlScaffoldFilters as OptionalConditionScaffoldFilters,
  type SssqlScaffoldSpec as OptionalConditionScaffoldSpec,
} from 'rawsql-ts';
import { invalidCliInputError } from '../../errors.js';

export interface OptionalConditionRewriteOptions {
  out?: string;
  preview?: boolean;
}

export interface OptionalConditionScaffoldOptions extends OptionalConditionRewriteOptions {
  filters?: OptionalConditionScaffoldFilters;
  spec?: OptionalConditionScaffoldSpec;
}

export interface OptionalConditionRemoveOptions extends OptionalConditionRewriteOptions {
  all?: boolean;
  spec?: OptionalConditionRemoveSpec;
}

export interface OptionalConditionRewriteReport {
  commandName: string;
  file: string;
  output_file: string;
  preview: boolean;
  changed: boolean;
  written: boolean;
  sql: string;
  diff: string;
}

export function listOptionalConditionBranches(sqlFile: string): OptionalConditionBranchInfo[] {
  return new OptionalConditionBuilder().list(readFileSync(path.resolve(sqlFile), 'utf8'));
}

/**
 * Adds SQL-first optional-condition branches to a query file.
 */
export function addOptionalCondition(sqlFile: string, options: OptionalConditionScaffoldOptions = {}): OptionalConditionRewriteReport {
  return applyOptionalConditionScaffoldRewrite(sqlFile, 'query optional add', options);
}

function applyOptionalConditionScaffoldRewrite(
  sqlFile: string,
  commandName: string,
  options: OptionalConditionScaffoldOptions
): OptionalConditionRewriteReport {
  return applyOptionalConditionRewrite(sqlFile, commandName, options, (sql) => {
    const builder = new OptionalConditionBuilder();
    if (options.spec) {
      return builder.planScaffoldBranch(sql, options.spec);
    }
    return builder.planScaffold(sql, options.filters ?? {});
  });
}

export function refreshOptionalConditions(sqlFile: string, options: OptionalConditionRewriteOptions = {}): OptionalConditionRewriteReport {
  return applyOptionalConditionRewrite(sqlFile, 'query optional refresh', options, (sql) => {
    const parsed = SelectQueryParser.parse(sql);
    const existingBranches = collectSupportedOptionalConditionBranches(parsed);
    const filters = Object.fromEntries(existingBranches.map((branch) => [branch.parameterName, null]));
    return new OptionalConditionBuilder().planRefresh(sql, filters);
  });
}

export function removeOptionalCondition(sqlFile: string, options: OptionalConditionRemoveOptions): OptionalConditionRewriteReport {
  return applyOptionalConditionRewrite(sqlFile, 'query optional remove', options, (sql) => {
    const builder = new OptionalConditionBuilder();
    if (options.all) {
      return builder.planRemoveAll(sql);
    }
    if (!options.spec) {
      throw invalidCliInputError(
        'ASHIBA_QUERY_OPTIONAL_REMOVE_TARGET_REQUIRED',
        'query optional remove requires either --all or --parameter.',
        'Pass --all to remove all supported branches, or pass --parameter for the branch to remove.',
      );
    }
    return builder.planRemove(sql, options.spec);
  });
}

export function normalizeOptionalConditionBranchKind(value: string): OptionalConditionBranchKind {
  if (value === 'scalar' || value === 'exists' || value === 'not-exists' || value === 'expression') {
    return value;
  }
  throw invalidCliInputError(
    'ASHIBA_QUERY_OPTIONAL_BRANCH_KIND_UNSUPPORTED',
    `Unsupported optional-condition branch kind: ${value}.`,
    'Use scalar, exists, not-exists, or expression as the optional-condition branch kind.',
    { value, supported: ['scalar', 'exists', 'not-exists', 'expression'] },
  );
}

function applyOptionalConditionRewrite(
  sqlFile: string,
  commandName: string,
  options: OptionalConditionRewriteOptions,
  planRewrite: (sql: string) => OptionalConditionRewritePlan
): OptionalConditionRewriteReport {
  const absoluteInputPath = path.resolve(sqlFile);
  const originalSql = readFileSync(absoluteInputPath, 'utf8');
  const plan = planRewrite(originalSql);
  assertSafeOptionalConditionPlan(plan, commandName);
  const updatedSql = ensureTrailingNewline(plan.sql ?? originalSql);
  assertNoCommentLoss(originalSql, updatedSql, commandName);

  SelectQueryParser.parse(updatedSql);

  const preview = Boolean(options.preview);
  const outputFile = path.resolve(options.out ?? absoluteInputPath);
  const changed = normalizeLineEndings(originalSql) !== normalizeLineEndings(updatedSql);
  const diff = createTwoFilesPatch(
    normalizePath(absoluteInputPath),
    normalizePath(outputFile),
    normalizeLineEndings(originalSql),
    normalizeLineEndings(updatedSql),
    '',
    '',
    { context: 3 }
  );

  if (!preview) {
    mkdirSync(path.dirname(outputFile), { recursive: true });
    writeFileSync(outputFile, updatedSql, 'utf8');
  }

  return {
    commandName,
    file: absoluteInputPath,
    output_file: outputFile,
    preview,
    changed,
    written: !preview,
    sql: updatedSql.trimEnd(),
    diff,
  };
}

function normalizeLineEndings(value: string): string {
  return value.replace(/\r\n/g, '\n');
}

function normalizePath(value: string): string {
  return value.split(path.sep).join('/');
}

function ensureTrailingNewline(value: string): string {
  return value.endsWith('\n') ? value : `${value}\n`;
}

function assertSafeOptionalConditionPlan(plan: OptionalConditionRewritePlan, commandName: string): void {
  if (!plan.ok) {
    throw invalidCliInputError(
      'ASHIBA_QUERY_OPTIONAL_REWRITE_PLAN_FAILED',
      `${commandName} could not build a safe SSSQL rewrite plan.`,
      'Inspect the reported SSSQL rewrite errors, adjust the SQL or command options, then rerun the command.',
      { commandName, warnings: plan.warnings, errors: plan.errors },
    );
  }
  if (!plan.sql) {
    throw invalidCliInputError(
      'ASHIBA_QUERY_OPTIONAL_REWRITE_PLAN_EMPTY',
      `${commandName} did not return rewritten SQL.`,
      'Update rawsql-ts or edit the SSSQL branch manually. Ashiba will not write when the rewrite result is unavailable.',
      { commandName, warnings: plan.warnings, errors: plan.errors },
    );
  }
  if (plan.requiresFullReformat || !plan.safety.changedOnlyTargetBranches) {
    throw invalidCliInputError(
      'ASHIBA_QUERY_OPTIONAL_REWRITE_UNSAFE',
      `${commandName} would rewrite more than the target SSSQL branch.`,
      'Ashiba writes SSSQL changes only when rawsql-ts reports a target-branch-only rewrite. Use preview/review output or edit the SQL manually.',
      {
        commandName,
        requiresFullReformat: plan.requiresFullReformat,
        safety: plan.safety,
        warnings: plan.warnings,
        errors: plan.errors,
      },
    );
  }
}

function assertNoCommentLoss(before: string, after: string, commandName: string): void {
  const beforeComments = extractSqlCommentFragments(before);
  if (beforeComments.length === 0) {
    return;
  }

  const normalizedAfter = normalizeLineEndings(after);
  const missing = beforeComments.filter((comment) => !normalizedAfter.includes(comment));
  if (missing.length > 0) {
    throw invalidCliInputError(
      'ASHIBA_QUERY_OPTIONAL_COMMENT_LOSS',
      `${commandName} would drop SQL comments during rewrite. Remove or relocate the comments before applying this command.`,
      'Move or remove the listed SQL comments, then rerun the rewrite command so Ashiba does not silently discard review context.',
      { commandName, missingComments: missing },
    );
  }
}

function extractSqlCommentFragments(sql: string): string[] {
  const normalized = normalizeLineEndings(sql);
  const lineMatches = normalized.match(/--.*$/gm) ?? [];
  const blockMatches = normalized.match(/\/\*[\s\S]*?\*\//g) ?? [];
  return [...lineMatches, ...blockMatches].map((comment) => comment.trim()).filter(Boolean);
}
