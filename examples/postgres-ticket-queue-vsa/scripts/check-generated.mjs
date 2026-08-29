import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const sqlDir = join(root, 'src', 'tickets', 'sql');
const generatedDir = join(root, 'src', 'tickets', 'generated');
const sqlFiles = readdirSync(sqlDir).filter((name) => name.endsWith('.sql'));
const schema = readFileSync(join(sqlDir, 'schema.sql'), 'utf8');
if (!/create table if not exists tickets/i.test(schema) || !/create table if not exists ticket_events/i.test(schema)) {
  throw new Error('schema.sql is missing one of the canonical tables');
}
for (const file of sqlFiles.filter((name) => name !== 'schema.sql')) {
  const base = basename(file, '.sql');
  const out = join(generatedDir, `${base}.ts`);
  if (!existsSync(out)) throw new Error(`missing generated binding: ${out}`);
  const result = spawnSync(process.execPath, [join(root, 'node_modules', '@ashiba-ts', 'cli', 'dist', 'index.js'), 'model-gen', join('src', 'tickets', 'sql', file), '--out', out, '--check'], { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`stale generated binding for ${file}: ${result.stderr || result.stdout}`);
}
console.log(`generated check: PASS (${sqlFiles.length} canonical SQL files; schema validated, ${sqlFiles.length - 1} bindings checked)`);
