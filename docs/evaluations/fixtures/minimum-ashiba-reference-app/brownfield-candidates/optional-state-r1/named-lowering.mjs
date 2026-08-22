/** Convert named SQL values to node-postgres placeholders without changing SQL syntax. */
export function lowerNamed(sql, params) {
  const orderedNames = [];
  let output = '';
  let i = 0;
  let quote = undefined;
  let lineComment = false;
  let blockComment = false;
  while (i < sql.length) {
    const char = sql[i];
    const next = sql[i + 1];
    if (lineComment) { output += char; if (char === '\n') lineComment = false; i += 1; continue; }
    if (blockComment) { output += char; if (char === '*' && next === '/') { output += next; i += 2; blockComment = false; } else i += 1; continue; }
    if (!quote && char === '-' && next === '-') { output += '--'; i += 2; lineComment = true; continue; }
    if (!quote && char === '/' && next === '*') { output += '/*'; i += 2; blockComment = true; continue; }
    if (quote) {
      output += char;
      if (char === quote && next === quote) { output += next; i += 2; continue; }
      if (char === quote) quote = undefined;
      i += 1; continue;
    }
    if (char === "'" || char === '"') { output += char; quote = char; i += 1; continue; }
    if (char === ':' && sql[i - 1] !== ':' && next !== ':' && /[A-Za-z_]/.test(next ?? '')) {
      const name = sql.slice(i + 1).match(/^[A-Za-z_][A-Za-z0-9_]*/)?.[0];
      if (!name || !(name in params)) throw new Error(`Missing named parameter: ${name}`);
      orderedNames.push(name); output += `$${orderedNames.length}`; i += name.length + 1; continue;
    }
    output += char; i += 1;
  }
  return { sql: output, values: orderedNames.map((name) => params[name]), orderedNames };
}
