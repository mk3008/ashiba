// Evaluation-only deterministic G1. It deliberately ignores SQL comments.
export function lowerNamedParameters(sql) {
  const names = [];
  let out = ''; let index = 0; let state = 'code';
  while (index < sql.length) {
    const char = sql[index]; const next = sql[index + 1];
    if (state === 'code' && char === '-' && next === '-') state = 'line';
    else if (state === 'code' && char === '/' && next === '*') state = 'block';
    else if (state === 'line' && char === '\n') state = 'code';
    else if (state === 'block' && char === '*' && next === '/') { out += '*/'; index += 2; state = 'code'; continue; }
    if (state === 'code' && char === ':' && /[A-Za-z_]/.test(next ?? '')) {
      const name = sql.slice(index + 1).match(/^[A-Za-z_][A-Za-z0-9_]*/)[0];
      names.push(name); out += `$${names.length}`; index += name.length + 1; continue;
    }
    out += char; index += 1;
  }
  return { sql: out, names };
}
