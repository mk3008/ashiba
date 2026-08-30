import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sqlDir = join(root, 'src', 'tickets', 'sql');
const generatedDir = join(root, 'src', 'tickets', 'generated');
const check = process.argv.includes('--check');
const cli = join(root, 'node_modules', '@ashiba-ts', 'cli', 'dist', 'index.js');

if (!existsSync(cli)) throw new Error(`Ashiba CLI not installed: ${cli}`);
mkdirSync(generatedDir, { recursive: true });
for (const filename of readdirSync(sqlDir).filter((name) => name.endsWith('.sql')).sort()) {
  const source = join(sqlDir, filename);
  const output = join(generatedDir, `${filename.slice(0, -4)}.generated.ts`);
  const args = ['model-gen', relative(root, source), '--out', relative(root, output)];
  if (check) args.push('--check');
  execFileSync(process.execPath, [cli, ...args], { cwd: root, stdio: 'inherit' });
}
