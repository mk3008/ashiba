import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const reference = path.join(repoRoot, 'examples', 'postgres-ticket-queue-reference');
if (!existsSync(path.join(reference, 'package.json'))) throw new Error('PostgreSQL Golden Path reference is missing.');
execFileSync(process.platform === 'win32' ? 'corepack.cmd' : 'corepack', ['pnpm', 'generate'], { cwd: reference, stdio: 'inherit', shell: process.platform === 'win32' });
console.log('Golden Path functional fixture generation passed. Live PostgreSQL verification is run by the reference verification command.');
