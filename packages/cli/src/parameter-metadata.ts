export type NamedParameterStyle = 'colon' | 'at' | 'both';

export type PlaceholderStyle = 'postgres' | 'question' | 'named-at';

export type CompileNamedParametersOptions = {
  parameterStyle?: NamedParameterStyle;
  placeholderStyle?: PlaceholderStyle;
};

export type CompileNamedParametersResult = {
  sql: string;
  orderedNames: string[];
};

type ScannerState = 'normal' | 'singleQuote' | 'doubleQuote' | 'dollarQuote' | 'lineComment' | 'blockComment';

const defaultOptions: Required<CompileNamedParametersOptions> = {
  parameterStyle: 'both',
  placeholderStyle: 'postgres',
};

export function compileNamedParameters(
  sql: string,
  options: CompileNamedParametersOptions = {},
): CompileNamedParametersResult {
  const resolved = { ...defaultOptions, ...options };
  const orderedNames: string[] = [];
  let output = '';
  let state: ScannerState = 'normal';
  let dollarTag: string | undefined;
  let singleQuoteBackslashEscapes = false;

  for (let index = 0; index < sql.length; index += 1) {
    const current = sql[index] ?? '';
    const next = sql[index + 1] ?? '';

    if (state === 'lineComment') {
      output += current;
      if (current === '\n') state = 'normal';
      continue;
    }

    if (state === 'blockComment') {
      output += current;
      if (current === '*' && next === '/') {
        output += next;
        index += 1;
        state = 'normal';
      }
      continue;
    }

    if (state === 'singleQuote') {
      output += current;
      if (singleQuoteBackslashEscapes && current === '\\' && next) {
        output += next;
        index += 1;
      } else if (current === "'" && next === "'") {
        output += next;
        index += 1;
      } else if (current === "'") {
        singleQuoteBackslashEscapes = false;
        state = 'normal';
      }
      continue;
    }

    if (state === 'doubleQuote') {
      output += current;
      if (current === '"' && next === '"') {
        output += next;
        index += 1;
      } else if (current === '"') {
        state = 'normal';
      }
      continue;
    }

    if (state === 'dollarQuote') {
      if (dollarTag && sql.startsWith(dollarTag, index)) {
        output += dollarTag;
        index += dollarTag.length - 1;
        dollarTag = undefined;
        state = 'normal';
      } else {
        output += current;
      }
      continue;
    }

    if (current === '-' && next === '-') {
      output += current + next;
      index += 1;
      state = 'lineComment';
      continue;
    }

    if (current === '/' && next === '*') {
      output += current + next;
      index += 1;
      state = 'blockComment';
      continue;
    }

    if (current === "'") {
      output += current;
      singleQuoteBackslashEscapes = isPostgresEscapeStringStart(sql, index);
      state = 'singleQuote';
      continue;
    }

    if (current === '"') {
      output += current;
      state = 'doubleQuote';
      continue;
    }

    const dollarMatch = sql.slice(index).match(/^\$[A-Za-z0-9_]*\$/);
    if (dollarMatch) {
      dollarTag = dollarMatch[0];
      output += dollarTag;
      index += dollarTag.length - 1;
      state = 'dollarQuote';
      continue;
    }

    const canUseColon = resolved.parameterStyle === 'colon' || resolved.parameterStyle === 'both';
    const canUseAt = resolved.parameterStyle === 'at' || resolved.parameterStyle === 'both';
    const isColonCast = current === ':' && next === ':';
    if (isColonCast) {
      output += current + next;
      index += 1;
      continue;
    }

    const isParameterStart = (canUseColon && current === ':' && !isColonCast) || (canUseAt && current === '@');

    if (isParameterStart && isNameStart(next)) {
      let end = index + 2;
      while (end < sql.length && isNamePart(sql[end] ?? '')) end += 1;
      const name = sql.slice(index + 1, end);
      orderedNames.push(name);
      output += renderPlaceholder(resolved.placeholderStyle, orderedNames.length, name);
      index = end - 1;
      continue;
    }

    output += current;
  }

  return {
    sql: output,
    orderedNames,
  };
}

function renderPlaceholder(style: PlaceholderStyle, position: number, name: string): string {
  if (style === 'postgres') return `$${position}`;
  if (style === 'named-at') return `@${name}`;
  return '?';
}

function isNameStart(value: string): boolean {
  return /[A-Za-z_]/.test(value);
}

function isNamePart(value: string): boolean {
  return /[A-Za-z0-9_]/.test(value);
}

function isPostgresEscapeStringStart(sql: string, quoteIndex: number): boolean {
  const marker = sql[quoteIndex - 1] ?? '';
  const beforeMarker = sql[quoteIndex - 2] ?? ' ';
  return /e/i.test(marker) && !/[A-Za-z0-9_$]/.test(beforeMarker);
}
