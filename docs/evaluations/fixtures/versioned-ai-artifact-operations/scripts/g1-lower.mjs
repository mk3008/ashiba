// Evaluator-owned deterministic G1 for this deliberately narrow SQL fixture.
// It is not an artifact generator and is intentionally independent of O1.
export function lowerNamedParameters(sql) {
  const names = [];
  let lowered = '';
  let index = 0;
  let state = 'code';
  while (index < sql.length) {
    const char = sql[index];
    const next = sql[index + 1];
    if (state === 'code' && char === '-' && next === '-') state = 'line-comment';
    else if (state === 'code' && char === '/' && next === '*') state = 'block-comment';
    else if (state === 'line-comment' && char === '\n') state = 'code';
    else if (state === 'block-comment' && char === '*' && next === '/') { lowered += '*/'; index += 2; state = 'code'; continue; }
    if (state === 'code' && char === ':' && /[A-Za-z_]/.test(next ?? '')) {
      const match = sql.slice(index + 1).match(/^[A-Za-z_][A-Za-z0-9_]*/);
      names.push(match[0]); lowered += `$${names.length}`; index += match[0].length + 1; continue;
    }
    lowered += char; index += 1;
  }
  return { sql: lowered, names };
}
