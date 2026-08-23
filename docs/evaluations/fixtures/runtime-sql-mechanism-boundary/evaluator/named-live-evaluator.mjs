import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';
import { compileAtDevelopmentTime } from '../named-parameter/fixture-compiler.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = process.env.ASHIBA_EVALUATION_DATABASE_URL;
if (!url) throw new Error('ASHIBA_EVALUATION_DATABASE_URL is required');
const source = await readFile(path.join(root, 'named-parameter', 'canonical.sql'), 'utf8');
const artifact = compileAtDevelopmentTime(source);
const values = artifact.orderedNames.map((name) => ({ id: 1, id2: 2, value: 'x' })[name]);
const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  const n0 = await client.query('select $1::bigint as id, $2::bigint as id2, $1::bigint as repeated_id, $3::text as value', [1, 2, 'x']);
  const n2 = await client.query(artifact.sql, values);
  const result = {
    status: 'pass',
    n0: { rows: n0.rows, runtimeWork: 'caller-ordered values only' },
    n2: { rows: n2.rows, orderedNames: artifact.orderedNames, values, runtimeWork: 'precompiled SQL plus orderedNames.map; no runtime SQL lexer or replacement' },
  };
  if (n0.rows[0].id !== n2.rows[0].id || n0.rows[0].id2 !== n2.rows[0].id2 || n0.rows[0].repeated_id !== n2.rows[0].repeated_id) throw new Error('N0/N2 row mismatch');
  await writeFile(path.join(root, 'evidence', 'named-live-result.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ status: result.status, orderedNames: artifact.orderedNames }));
} finally {
  await client.end();
}
