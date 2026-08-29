import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = new URL('..', import.meta.url).pathname.replace(/^\//, '').replaceAll('/', '\\');
const sqlDir = join(root, 'src', 'tickets', 'sql');
const outDir = join(root, 'src', 'tickets', 'generated');
for (const file of readdirSync(sqlDir).filter((name) => name.endsWith('.sql') && name !== 'schema.sql')) {
  const base = basename(file, '.sql');
  const out = join(outDir, `${base}.ts`);
  const result = spawnSync(process.execPath, [join(root, 'node_modules', '@ashiba-ts', 'cli', 'dist', 'index.js'), 'model-gen', join('src', 'tickets', 'sql', file), '--out', out], { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  writeFileSync(join(outDir, `${base}.mjs`), readFileSync(out, 'utf8').replace(' as const;', ';'));
}
