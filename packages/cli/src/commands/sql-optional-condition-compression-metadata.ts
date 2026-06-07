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
  groups?: SqlOptionalConditionCompressionGroup[];
}

export interface SqlOptionalConditionCompressionGroup {
  branchIndexes: number[];
  removalRange: OptionalConditionSourceRange;
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
  const branches = [...rawsqlBranches, ...fallbackBranches]
    .sort((left, right) => left.sourceRange.start - right.sourceRange.start)
    .map((branch) => ({
    ...branch,
    removalRange: normalizeOptionalConditionRemovalRange(sql, branch.removalRange),
    presentReplacement: buildPresentReplacement(branch),
  }));
  const groups = buildOptionalConditionCompressionGroups(sql, branches);
  return {
    enabled: true,
    branches,
    ...(groups.length > 0 ? { groups } : {}),
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
  let quoteBackslashEscapes = false;
  let dollarTag: string | undefined;
  let lineComment = false;
  let blockComment = false;
  for (let index = 0; index < sql.length; index += 1) {
    const current = sql[index] ?? '';
    const next = sql[index + 1] ?? '';
    if (dollarTag) {
      if (sql.startsWith(dollarTag, index)) {
        index += dollarTag.length - 1;
        dollarTag = undefined;
      }
      continue;
    }
    if (lineComment) {
      if (current === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (current === '*' && next === '/') {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (quoteBackslashEscapes && current === '\\' && next) {
        index += 1;
        continue;
      }
      if (current === quote && next === quote) {
        index += 1;
        continue;
      }
      if (current === quote) {
        quote = undefined;
        quoteBackslashEscapes = false;
      }
      continue;
    }
    if (current === '-' && next === '-') {
      lineComment = true;
      index += 1;
      continue;
    }
    if (current === '/' && next === '*') {
      blockComment = true;
      index += 1;
      continue;
    }
    const dollarQuote = postgresDollarQuoteAt(sql, index);
    if (dollarQuote) {
      dollarTag = dollarQuote;
      index += dollarQuote.length - 1;
      continue;
    }
    if (current === "'" || current === '"') {
      quote = current;
      quoteBackslashEscapes = current === "'" && isPostgresEscapeStringStart(sql, index);
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
    const trailingWhitespace = after.slice(afterMatch[0].length).match(/^\s*/)?.[0] ?? '';
    return {
      start,
      end: end + afterMatch[0].length + trailingWhitespace.length,
      text: sql.slice(start, end + afterMatch[0].length + trailingWhitespace.length),
    };
  }
  return {
    start,
    end,
    text: sql.slice(start, end),
  };
}

function normalizeOptionalConditionRemovalRange(
  sql: string,
  range: OptionalConditionSourceRange,
): OptionalConditionSourceRange {
  const rangeText = sql.slice(range.start, range.end);
  const whereAtRangeStart = rangeText.match(/^\s*where\b\s*/i);
  if (whereAtRangeStart?.[0]) {
    if (hasRemainingWherePredicateAfter(sql, range.end)) {
      const danglingConnective = sql.slice(range.end).match(/^\s+(?:and|or)\b\s*/i);
      const start = range.start + whereAtRangeStart[0].length;
      const end = danglingConnective?.[0] ? range.end + danglingConnective[0].length : range.end;
      return {
        start,
        end,
        text: sql.slice(start, end),
      };
    }
    return {
      start: range.start,
      end: range.end,
      text: sql.slice(range.start, range.end),
    };
  }

  const before = sql.slice(0, range.start);
  const whereMatch = before.match(/\bwhere(?:\s|\/\*[\s\S]*?\*\/|--[^\n]*(?:\n|$))*$/i);
  if (!whereMatch || whereMatch.index === undefined) {
    return {
      start: range.start,
      end: range.end,
      text: sql.slice(range.start, range.end),
    };
  }

  if (hasRemainingWherePredicateAfter(sql, range.end)) {
    const danglingConnective = sql.slice(range.end).match(/^\s+(?:and|or)\b\s*/i);
    if (danglingConnective?.[0]) {
      return {
        start: range.start,
        end: range.end + danglingConnective[0].length,
        text: sql.slice(range.start, range.end + danglingConnective[0].length),
      };
    }
    const trailingWhitespace = sql.slice(range.end).match(/^\s+/)?.[0] ?? '';
    return {
      start: range.start,
      end: range.end + trailingWhitespace.length,
      text: sql.slice(range.start, range.end + trailingWhitespace.length),
    };
  }

  return {
    start: whereMatch.index,
    end: range.end,
    text: sql.slice(whereMatch.index, range.end),
  };
}

function hasRemainingWherePredicateAfter(sql: string, index: number): boolean {
  const after = sql.slice(index).trimStart();
  if (after.length === 0 || after.startsWith(';')) {
    return false;
  }
  if (/^(?:and|or)\b/i.test(after)) {
    return hasRemainingWherePredicateAfter(after.replace(/^(?:and|or)\b\s*/i, ''), 0);
  }
  return !/^(?:group\s+by|order\s+by|having|window|limit|offset|fetch|for|union|intersect|except)\b|^\)|^;/i.test(after);
}

function buildOptionalConditionCompressionGroups(
  sql: string,
  branches: readonly SqlOptionalConditionCompressionBranch[],
): SqlOptionalConditionCompressionGroup[] {
  const groups: SqlOptionalConditionCompressionGroup[] = [];
  const consumed = new Set<number>();
  for (let index = 0; index < branches.length; index += 1) {
    if (consumed.has(index)) continue;
    const branch = branches[index];
    if (!branch) continue;
    const wherePrefix = findWherePrefixForBranch(sql, branch.sourceRange.start);
    if (!wherePrefix) continue;

    const groupIndexes = collectContiguousOptionalWhereBranchIndexes(sql, branches, index, wherePrefix.end);
    if (groupIndexes.length < 2) continue;
    const lastBranch = branches[groupIndexes[groupIndexes.length - 1] ?? -1];
    if (!lastBranch) continue;
    const remainingPredicateAfterGroup = hasRemainingWherePredicateAfter(sql, lastBranch.sourceRange.end);
    const trailingConnective = remainingPredicateAfterGroup
      ? sql.slice(lastBranch.sourceRange.end).match(/^\s+(?:and|or)\b\s*/i)?.[0] ?? ''
      : '';
    const start = remainingPredicateAfterGroup ? wherePrefix.keepStart : wherePrefix.start;
    const end = lastBranch.sourceRange.end + trailingConnective.length;

    groups.push({
      branchIndexes: groupIndexes,
      removalRange: {
        start,
        end,
        text: sql.slice(start, end),
      },
    });
    for (const groupIndex of groupIndexes) consumed.add(groupIndex);
  }
  return groups;
}

function findWherePrefixForBranch(sql: string, branchStart: number): { start: number; end: number; keepStart: number } | undefined {
  const before = sql.slice(0, branchStart);
  const match = before.match(/\bwhere(?:\s|\/\*[\s\S]*?\*\/|--[^\n]*(?:\n|$))*$/i);
  if (!match || match.index === undefined) return undefined;
  const whereKeyword = match[0].match(/\bwhere\b\s*/i)?.[0] ?? 'where';
  return {
    start: match.index,
    end: branchStart,
    keepStart: match.index + whereKeyword.length,
  };
}

function collectContiguousOptionalWhereBranchIndexes(
  sql: string,
  branches: readonly SqlOptionalConditionCompressionBranch[],
  firstIndex: number,
  cursorStart: number,
): number[] {
  const groupIndexes: number[] = [];
  let cursor = cursorStart;
  for (let index = firstIndex; index < branches.length; index += 1) {
    const branch = branches[index];
    if (!branch) break;
    const between = sql.slice(cursor, branch.sourceRange.start);
    if (groupIndexes.length === 0) {
      if (!isWhereBranchSeparator(between, false)) break;
    } else if (!isWhereBranchSeparator(between, true)) {
      break;
    }
    groupIndexes.push(index);
    cursor = branch.sourceRange.end;
  }
  return groupIndexes;
}

function isWhereBranchSeparator(value: string, requiresConnector: boolean): boolean {
  let text = stripSqlTrivia(value).trim();
  if (!requiresConnector) return text.length === 0;
  text = text.replace(/^(?:and|or)\b/i, '').trim();
  return text.length === 0;
}

function stripSqlTrivia(value: string): string {
  return value
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\n]*(?:\n|$)/g, ' ');
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
    const inactiveEnd = inactiveSqlFragmentEnd(value, index);
    if (inactiveEnd !== undefined) {
      index = inactiveEnd - 1;
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
  return guardedParameterName(value) === parameterName;
}

function guardedParameterName(value: string): string | undefined {
  const text = stripBalancedOuterParens(value).text;
  const directMatch = text.match(/^\s*:([A-Za-z_][A-Za-z0-9_]*)\s+is\s+null\s*$/i);
  if (directMatch?.[1]) {
    return directMatch[1];
  }
  const postgresCastMatch = text.match(/^\s*:([A-Za-z_][A-Za-z0-9_]*)(?:::[A-Za-z_][A-Za-z0-9_]*(?:\s*\[\s*\])*)+\s+is\s+null\s*$/i);
  if (postgresCastMatch?.[1]) {
    return postgresCastMatch[1];
  }
  const castMatch = text.match(/^\s*cast\s*\(\s*:([A-Za-z_][A-Za-z0-9_]*)\s+as\s+.+\)\s+is\s+null\s*$/i);
  return castMatch?.[1];
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
    const inactiveEnd = inactiveSqlFragmentEnd(value, index);
    if (inactiveEnd !== undefined) {
      index = inactiveEnd - 1;
      continue;
    }
    if (current === ':' && next === ':') {
      index += 1;
      continue;
    }
    if (current === ':') {
      const match = value.slice(index + 1).match(/^([A-Za-z_][A-Za-z0-9_]*)/);
      if (match?.[1]) {
        names.push(match[1]);
        index += match[1].length;
      }
    }
  }
  return names;
}

function inactiveSqlFragmentEnd(sql: string, index: number): number | undefined {
  const current = sql[index] ?? '';
  const next = sql[index + 1] ?? '';
  if (current === '-' && next === '-') {
    const lineEnd = sql.indexOf('\n', index + 2);
    return lineEnd < 0 ? sql.length : lineEnd;
  }
  if (current === '/' && next === '*') {
    const blockEnd = sql.indexOf('*/', index + 2);
    return blockEnd < 0 ? sql.length : blockEnd + 2;
  }
  if (current === '$') {
    const tag = postgresDollarQuoteAt(sql, index);
    if (!tag) return undefined;
    const quoteEnd = sql.indexOf(tag, index + tag.length);
    return quoteEnd < 0 ? sql.length : quoteEnd + tag.length;
  }
  return undefined;
}

function postgresDollarQuoteAt(sql: string, index: number): string | undefined {
  const match = sql.slice(index).match(/^(\$\$|\$[A-Za-z_][A-Za-z0-9_]*\$)/);
  return match?.[0];
}

function isPostgresEscapeStringStart(sql: string, quoteIndex: number): boolean {
  const marker = sql[quoteIndex - 1] ?? '';
  if (marker !== 'E' && marker !== 'e') {
    return false;
  }
  const beforeMarker = sql[quoteIndex - 2] ?? '';
  return !/[A-Za-z0-9_$]/.test(beforeMarker);
}
