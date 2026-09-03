export type Prepared = { sql: string; names: string[] };

export function compile(sql: string): Prepared {
  const names: string[] = [];
  const positions = new Map<string, number>();
  let out = ''; let state: 'normal' | 'single' | 'double' | 'line' | 'block' | 'dollar' = 'normal'; let tag = '';
  for (let i = 0; i < sql.length; i += 1) {
    const c = sql[i] ?? ''; const n = sql[i + 1] ?? '';
    if (state === 'line') { out += c; if (c === '\n') state = 'normal'; continue; }
    if (state === 'block') { out += c; if (c === '*' && n === '/') { out += n; i += 1; state = 'normal'; } continue; }
    if (state === 'single') { out += c; if (c === "'" && n === "'") { out += n; i += 1; } else if (c === "'") state = 'normal'; continue; }
    if (state === 'double') { out += c; if (c === '"' && n === '"') { out += n; i += 1; } else if (c === '"') state = 'normal'; continue; }
    if (state === 'dollar') { if (sql.startsWith(tag, i)) { out += tag; i += tag.length - 1; state = 'normal'; } else out += c; continue; }
    if (c === '-' && n === '-') { out += '--'; i += 1; state = 'line'; continue; }
    if (c === '/' && n === '*') { out += '/*'; i += 1; state = 'block'; continue; }
    if (c === "'") { out += c; state = 'single'; continue; }
    if (c === '"') { out += c; state = 'double'; continue; }
    const dollar = sql.slice(i).match(/^\$[A-Za-z0-9_]*\$/)?.[0];
    if (dollar) { out += dollar; i += dollar.length - 1; tag = dollar; state = 'dollar'; continue; }
    if (c === ':' && n === ':') { out += '::'; i += 1; continue; }
    if (c === ':' && /[A-Za-z_]/.test(n)) {
      let end = i + 2; while (/[A-Za-z0-9_]/.test(sql[end] ?? '')) end += 1;
      const name = sql.slice(i + 1, end); let position = positions.get(name);
      if (!position) { position = names.length + 1; positions.set(name, position); names.push(name); }
      out += `$${position}`; i = end - 1; continue;
    }
    out += c;
  }
  if (state === 'single' || state === 'double' || state === 'block' || state === 'dollar') throw new Error('Unterminated SQL lexical region');
  return { sql: out, names };
}

export function bind(prepared: Prepared, params: Record<string, unknown>) {
  const missing = prepared.names.filter((name) => !Object.hasOwn(params, name));
  const extra = Object.keys(params).filter((name) => !prepared.names.includes(name));
  if (missing.length || extra.length) throw new Error(`bindings missing=${missing.join(',')} extra=${extra.join(',')}`);
  return { sql: prepared.sql, values: prepared.names.map((name) => params[name]) };
}
