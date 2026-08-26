import type { ParameterBinding } from './index.js';

export type CanonicalNamedParameterSyntax = 'colon' | 'at' | 'both';
export type IndexedRendering = { style: 'indexed'; prefix: string };
export type NamedRendering = { style: 'named'; prefix: string; suffix?: string };
export type AnonymousRendering = { style: 'anonymous'; token: string };
export type ParameterRendering = IndexedRendering | NamedRendering | AnonymousRendering;
export type CompileNamedParametersOptions = { canonicalSyntax?: CanonicalNamedParameterSyntax; rendering?: ParameterRendering };
type IndexedBinding = Extract<ParameterBinding, { style: 'indexed' }>;
type NamedBinding = Extract<ParameterBinding, { style: 'named' }>;
type AnonymousBinding = Extract<ParameterBinding, { style: 'anonymous' }>;
type ScannerState = 'normal' | 'singleQuote' | 'doubleQuote' | 'dollarQuote' | 'lineComment' | 'blockComment';
const defaultRendering: IndexedRendering = { style: 'indexed', prefix: '$' };

export function compileNamedParameters(sql: string): IndexedBinding;
export function compileNamedParameters(sql: string, options: CompileNamedParametersOptions & { rendering?: IndexedRendering }): IndexedBinding;
export function compileNamedParameters(sql: string, options: CompileNamedParametersOptions & { rendering: NamedRendering }): NamedBinding;
export function compileNamedParameters(sql: string, options: CompileNamedParametersOptions & { rendering: AnonymousRendering }): AnonymousBinding;
/** Lowers canonical SQL at build time; values are never written into SQL text. */
export function compileNamedParameters(sql: string, options: CompileNamedParametersOptions = {}): ParameterBinding {
  const canonicalSyntax = options.canonicalSyntax ?? 'both'; const rendering = options.rendering ?? defaultRendering;
  const parameterNames: string[] = []; const valueNames: string[] = []; const positions = new Map<string, number>();
  let output = ''; let state: ScannerState = 'normal'; let dollarTag: string | undefined; let singleQuoteBackslashEscapes = false; let blockCommentDepth = 0;
  for (let index = 0; index < sql.length; index += 1) {
    const current = sql[index] ?? ''; const next = sql[index + 1] ?? '';
    if (state === 'lineComment') { output += current; if (current === '\n') state = 'normal'; continue; }
    if (state === 'blockComment') { output += current; if (current === '/' && next === '*') { output += next; index += 1; blockCommentDepth += 1; } else if (current === '*' && next === '/') { output += next; index += 1; blockCommentDepth -= 1; if (blockCommentDepth === 0) state = 'normal'; } continue; }
    if (state === 'singleQuote') { output += current; if (singleQuoteBackslashEscapes && current === '\\' && next) { output += next; index += 1; } else if (current === "'" && next === "'") { output += next; index += 1; } else if (current === "'") { singleQuoteBackslashEscapes = false; state = 'normal'; } continue; }
    if (state === 'doubleQuote') { output += current; if (current === '"' && next === '"') { output += next; index += 1; } else if (current === '"') state = 'normal'; continue; }
    if (state === 'dollarQuote') { if (dollarTag && sql.startsWith(dollarTag, index)) { output += dollarTag; index += dollarTag.length - 1; dollarTag = undefined; state = 'normal'; } else output += current; continue; }
    if (current === '-' && next === '-') { output += current + next; index += 1; state = 'lineComment'; continue; }
    if (current === '/' && next === '*') { output += current + next; index += 1; state = 'blockComment'; blockCommentDepth = 1; continue; }
    if (current === "'") { output += current; singleQuoteBackslashEscapes = isPostgresEscapeStringStart(sql, index); state = 'singleQuote'; continue; }
    if (current === '"') { output += current; state = 'doubleQuote'; continue; }
    const dollarMatch = sql.slice(index).match(/^\$[A-Za-z0-9_]*\$/);
    if (dollarMatch) { dollarTag = dollarMatch[0]; output += dollarTag; index += dollarTag.length - 1; state = 'dollarQuote'; continue; }
    const canUseColon = canonicalSyntax === 'colon' || canonicalSyntax === 'both'; const canUseAt = canonicalSyntax === 'at' || canonicalSyntax === 'both';
    if (current === ':' && next === ':') { output += current + next; index += 1; continue; }
    if (((canUseColon && current === ':') || (canUseAt && current === '@')) && isNameStart(next)) {
      let end = index + 2; while (end < sql.length && isNamePart(sql[end] ?? '')) end += 1; const name = sql.slice(index + 1, end);
      if (rendering.style === 'anonymous') { valueNames.push(name); output += rendering.token; }
      else { let position = positions.get(name); if (position === undefined) { position = positions.size + 1; positions.set(name, position); parameterNames.push(name); } output += rendering.style === 'indexed' ? `${rendering.prefix}${position}` : `${rendering.prefix}${name}${rendering.suffix ?? ''}`; }
      index = end - 1; continue;
    }
    output += current;
  }
  return rendering.style === 'anonymous' ? { style: 'anonymous', sql: output, valueNames } : { style: rendering.style, sql: output, parameterNames };
}
function isNameStart(value: string): boolean { return /[A-Za-z_]/.test(value); }
function isNamePart(value: string): boolean { return /[A-Za-z0-9_]/.test(value); }
function isPostgresEscapeStringStart(sql: string, quoteIndex: number): boolean { const marker = sql[quoteIndex - 1] ?? ''; const beforeMarker = sql[quoteIndex - 2] ?? ' '; return /e/i.test(marker) && !/[A-Za-z0-9_$]/.test(beforeMarker); }
