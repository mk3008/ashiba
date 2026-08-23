export function compileAtDevelopmentTime(sql) {
  const names = []; let out = ''; let i = 0; let quote = ''; let dollar = ''; let line = false; let blockDepth = 0;
  while (i < sql.length) {
    const c = sql[i], n = sql[i + 1];
    if (line) { out += c; if (c === '\n') line = false; i++; continue; }
    if (blockDepth) { out += c; if (c === '/' && n === '*') { out += n; i += 2; blockDepth++; continue; } if (c === '*' && n === '/') { out += n; i += 2; blockDepth--; continue; } i++; continue; }
    if (dollar) { if (sql.startsWith(dollar, i)) { out += dollar; i += dollar.length; dollar = ''; } else { out += c; i++; } continue; }
    if (quote) { out += c; if (c === quote && n === quote) { out += n; i += 2; continue; } if (c === quote) quote = ''; i++; continue; }
    if (c === '-' && n === '-') { out += '--'; i += 2; line = true; continue; }
    if (c === '/' && n === '*') { out += '/*'; i += 2; blockDepth = 1; continue; }
    if (c === "'" || c === '"') { out += c; quote = c; i++; continue; }
    const tag = sql.slice(i).match(/^\$[A-Za-z0-9_]*\$/)?.[0]; if (tag) { out += tag; i += tag.length; dollar = tag; continue; }
    if (c === ':' && n !== ':' && sql[i - 1] !== ':' && /[A-Za-z_]/.test(n ?? '')) { const name = sql.slice(i + 1).match(/^[A-Za-z_][A-Za-z0-9_]*/)[0]; names.push(name); out += `$${names.length}`; i += name.length + 1; continue; }
    out += c; i++;
  }
  return { sql: out, orderedNames: names };
}
