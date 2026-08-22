import { createHash, randomUUID } from 'node:crypto';
import pg from 'pg';
import { compilePostgresQuery } from '../../../../../packages/driver-adapter-pg/dist/index.js';

const canonicalSql = "select :note::text as note, :status::text as status, ':not_a_parameter'::text as literal /* :not_a_parameter */ where :status::text = :status";
const hash = `sha256:${createHash('sha256').update(canonicalSql).digest('hex')}`;
const input = { note: 'x', status: 'open' };
const r1 = compilePostgresQuery({
  sql: canonicalSql,
  queryModel: { analysis: { sourceHash: hash }, bindings: { postgres: {
    sourceHash: hash,
    sql: "select $1::text as note, $2::text as status, ':not_a_parameter'::text as literal /* :not_a_parameter */ where $3::text = $4",
    orderedNames: ['note', 'status', 'status', 'status'],
  } } },
}, input);

// R2 is intentionally application-owned and small. It scans only code tokens,
// leaving quoted strings, comments, and PostgreSQL :: casts intact.
function lowerNamed(sql, params) {
  const names = [];
  let output = '';
  let index = 0;
  let quote = false;
  let lineComment = false;
  let blockComment = false;
  while (index < sql.length) {
    const char = sql[index];
    const next = sql[index + 1];
    if (lineComment) { output += char; if (char === '\n') lineComment = false; index += 1; continue; }
    if (blockComment) { output += char; if (char === '*' && next === '/') { output += next; index += 2; blockComment = false; } else index += 1; continue; }
    if (!quote && char === '-' && next === '-') { output += '--'; index += 2; lineComment = true; continue; }
    if (!quote && char === '/' && next === '*') { output += '/*'; index += 2; blockComment = true; continue; }
    if (char === "'") { output += char; if (quote && next === "'") { output += next; index += 2; continue; } quote = !quote; index += 1; continue; }
    if (!quote && char === ':' && sql[index - 1] !== ':' && next !== ':' && /[A-Za-z_]/.test(next ?? '')) {
      const match = sql.slice(index + 1).match(/^[A-Za-z_][A-Za-z0-9_]*/)?.[0];
      if (!match || !(match in params)) throw new Error(`missing ${match}`);
      names.push(match); output += `$${names.length}`; index += match.length + 1; continue;
    }
    output += char; index += 1;
  }
  return { sql: output, values: names.map((name) => params[name]), orderedNames: names };
}
const r2 = lowerNamed(canonicalSql, input);
const expectedSql = "select $1::text as note, $2::text as status, ':not_a_parameter'::text as literal /* :not_a_parameter */ where $3::text = $4";
if (r1.sql !== expectedSql || r2.sql !== expectedSql || JSON.stringify(r1.values) !== JSON.stringify(r2.values)) throw new Error('R1/R2 lowering mismatch');
const connectionString = process.env.ASHIBA_EVALUATION_DATABASE_URL;
if (!connectionString) throw new Error('ASHIBA_EVALUATION_DATABASE_URL is required');
const client = new pg.Client({ connectionString });
await client.connect();
try {
  for (const result of [r1, r2]) {
    const row = (await client.query(result.sql, result.values)).rows[0];
    if (row.note !== 'x' || row.status !== 'open' || row.literal !== ':not_a_parameter') throw new Error('PostgreSQL result mismatch');
  }
} finally { await client.end(); }
console.log(JSON.stringify({ r1: { sql: r1.sql, orderedNames: r1.orderedNames, values: r1.values }, r2 }));
