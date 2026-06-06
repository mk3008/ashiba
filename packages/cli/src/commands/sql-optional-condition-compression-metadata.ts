import {
  collectSupportedOptionalConditionBranchSpans,
  type OptionalConditionSourceRange,
  type SupportedOptionalConditionBranchKind,
} from 'rawsql-ts';

export type { OptionalConditionSourceRange };

export interface SqlOptionalConditionCompressionBranch {
  parameterName: string;
  kind: SupportedOptionalConditionBranchKind;
  sourceRange: OptionalConditionSourceRange;
  removalRange: OptionalConditionSourceRange;
  presentReplacement: OptionalConditionSourceRange;
}

export interface SqlOptionalConditionCompressionMetadata {
  enabled: true;
  branches: SqlOptionalConditionCompressionBranch[];
}

/**
 * Builds optional condition compression metadata from the rawsql-ts AST-backed span collector.
 */
export function buildSqlOptionalConditionCompressionMetadata(sql: string): SqlOptionalConditionCompressionMetadata {
  const rawsqlBranches = collectSupportedOptionalConditionBranchSpans(sql);
  const fallbackBranches = collectFallbackOptionalConditionBranchSpans(sql)
    .filter((branch) => !rawsqlBranches.some((existing) => (
      existing.sourceRange.start === branch.sourceRange.start
      && existing.sourceRange.end === branch.sourceRange.end
    )));
  return {
    enabled: true,
    branches: [...rawsqlBranches, ...fallbackBranches]
      .sort((left, right) => left.sourceRange.start - right.sourceRange.start)
      .map((branch) => ({
      ...branch,
      presentReplacement: buildPresentReplacement(branch),
    })),
  };
}

function collectFallbackOptionalConditionBranchSpans(sql: string): Array<{
  parameterName: string;
  kind: SupportedOptionalConditionBranchKind;
  sourceRange: OptionalConditionSourceRange;
  removalRange: OptionalConditionSourceRange;
}> {
  const spans: Array<{
    parameterName: string;
    kind: SupportedOptionalConditionBranchKind;
    sourceRange: OptionalConditionSourceRange;
    removalRange: OptionalConditionSourceRange;
  }> = [];
  const stack: number[] = [];
  let quote: "'" | '"' | undefined;
  for (let index = 0; index < sql.length; index += 1) {
    const current = sql[index] ?? '';
    const next = sql[index + 1] ?? '';
    if (quote) {
      if (current === quote && next === quote) {
        index += 1;
        continue;
      }
      if (current === quote) quote = undefined;
      continue;
    }
    if (current === "'" || current === '"') {
      quote = current;
      continue;
    }
    if (current === '(') {
      stack.push(index);
      continue;
    }
    if (current !== ')') {
      continue;
    }
    const start = stack.pop();
    if (start === undefined) {
      continue;
    }
    const candidate = buildFallbackOptionalConditionBranchSpan(sql, start, index + 1);
    if (candidate) {
      spans.push(candidate);
    }
  }
  return spans;
}

function buildFallbackOptionalConditionBranchSpan(
  sql: string,
  start: number,
  end: number,
): {
  parameterName: string;
  kind: SupportedOptionalConditionBranchKind;
  sourceRange: OptionalConditionSourceRange;
  removalRange: OptionalConditionSourceRange;
} | undefined {
  const sourceText = sql.slice(start, end);
  const inner = stripBalancedOuterParens(sourceText);
  const terms = splitTopLevelOrTerms(inner.text);
  if (terms.length < 2) return undefined;
  const guards = terms
    .map((term) => ({ term, parameterName: guardedParameterName(term.text) }))
    .filter((entry): entry is { term: { text: string }; parameterName: string } => entry.parameterName !== undefined);
  if (guards.length !== 1) return undefined;
  const [{ term: guard, parameterName }] = guards;
  const meaningfulTerms = terms.filter((term) => term !== guard);
  if (meaningfulTerms.length === 0) return undefined;
  if (!meaningfulTerms.every((term) => {
    const names = collectNamedParameters(term.text);
    return names.length > 0 && names.every((name) => name === parameterName);
  })) {
    return undefined;
  }
  return {
    parameterName,
    kind: 'expression',
    sourceRange: {
      start,
      end,
      text: sourceText,
    },
    removalRange: buildFallbackRemovalRange(sql, start, end),
  };
}

function buildFallbackRemovalRange(sql: string, start: number, end: number): OptionalConditionSourceRange {
  const before = sql.slice(0, start);
  const after = sql.slice(end);
  const beforeMatch = before.match(/\b(?:and|where)\s*$/i);
  if (beforeMatch?.index !== undefined) {
    return {
      start: beforeMatch.index,
      end,
      text: sql.slice(beforeMatch.index, end),
    };
  }
  const afterMatch = after.match(/^\s*and\b/i);
  if (afterMatch?.[0]) {
    return {
      start,
      end: end + afterMatch[0].length,
      text: sql.slice(start, end + afterMatch[0].length),
    };
  }
  return {
    start,
    end,
    text: sql.slice(start, end),
  };
}

function buildPresentReplacement(branch: {
  parameterName: string;
  sourceRange: OptionalConditionSourceRange;
}): OptionalConditionSourceRange {
  const source = branch.sourceRange.text;
  const inner = stripBalancedOuterParens(source);
  const terms = splitTopLevelOrTerms(inner.text);
  const meaningfulTerms = terms.filter((term) => !isNullGuard(term.text, branch.parameterName));
  if (meaningfulTerms.length === terms.length || meaningfulTerms.length === 0) {
    return {
      start: branch.sourceRange.start,
      end: branch.sourceRange.end,
      text: source,
    };
  }

  const text = meaningfulTerms.length === 1
    ? meaningfulTerms[0]?.text.trim() ?? source
    : `(${meaningfulTerms.map((term) => term.text.trim()).join(' or ')})`;
  return {
    start: branch.sourceRange.start,
    end: branch.sourceRange.end,
    text,
  };
}

function stripBalancedOuterParens(value: string): { text: string; offset: number } {
  let text = value.trim();
  let offset = value.indexOf(text);
  while (text.startsWith('(') && text.endsWith(')') && wrapsWholeExpression(text)) {
    text = text.slice(1, -1).trim();
    offset += 1 + text.search(/\S/);
  }
  return { text, offset };
}

function wrapsWholeExpression(value: string): boolean {
  let depth = 0;
  let quote: "'" | '"' | undefined;
  for (let index = 0; index < value.length; index += 1) {
    const current = value[index] ?? '';
    const next = value[index + 1] ?? '';
    if (quote) {
      if (current === quote && next === quote) {
        index += 1;
        continue;
      }
      if (current === quote) quote = undefined;
      continue;
    }
    if (current === "'" || current === '"') {
      quote = current;
      continue;
    }
    if (current === '(') depth += 1;
    if (current === ')') depth -= 1;
    if (depth === 0 && index < value.length - 1) return false;
  }
  return depth === 0;
}

function splitTopLevelOrTerms(value: string): Array<{ text: string }> {
  const terms: Array<{ text: string }> = [];
  let depth = 0;
  let quote: "'" | '"' | undefined;
  let start = 0;
  for (let index = 0; index < value.length; index += 1) {
    const current = value[index] ?? '';
    const next = value[index + 1] ?? '';
    if (quote) {
      if (current === quote && next === quote) {
        index += 1;
        continue;
      }
      if (current === quote) quote = undefined;
      continue;
    }
    if (current === "'" || current === '"') {
      quote = current;
      continue;
    }
    if (current === '(') {
      depth += 1;
      continue;
    }
    if (current === ')') {
      depth -= 1;
      continue;
    }
    if (depth === 0 && isTopLevelOrAt(value, index)) {
      terms.push({ text: value.slice(start, index) });
      index += 1;
      start = index + 1;
    }
  }
  terms.push({ text: value.slice(start) });
  return terms;
}

function isTopLevelOrAt(value: string, index: number): boolean {
  if (value.slice(index, index + 2).toLowerCase() !== 'or') return false;
  const before = value[index - 1] ?? ' ';
  const after = value[index + 2] ?? ' ';
  return !/[A-Za-z0-9_]/.test(before) && !/[A-Za-z0-9_]/.test(after);
}

function isNullGuard(value: string, parameterName: string): boolean {
  const escaped = parameterName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^\\s*:${escaped}\\s+is\\s+null\\s*$`, 'i').test(stripBalancedOuterParens(value).text);
}

function guardedParameterName(value: string): string | undefined {
  const match = stripBalancedOuterParens(value).text.match(/^\s*:([A-Za-z_][A-Za-z0-9_]*)\s+is\s+null\s*$/i);
  return match?.[1];
}

function collectNamedParameters(value: string): string[] {
  const names: string[] = [];
  let quote: "'" | '"' | undefined;
  for (let index = 0; index < value.length; index += 1) {
    const current = value[index] ?? '';
    const next = value[index + 1] ?? '';
    if (quote) {
      if (current === quote && next === quote) {
        index += 1;
        continue;
      }
      if (current === quote) quote = undefined;
      continue;
    }
    if (current === "'" || current === '"') {
      quote = current;
      continue;
    }
    if (current === ':' && next !== ':') {
      const match = value.slice(index + 1).match(/^([A-Za-z_][A-Za-z0-9_]*)/);
      if (match?.[1]) {
        names.push(match[1]);
        index += match[1].length;
      }
    }
  }
  return names;
}
