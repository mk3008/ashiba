import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const reference = path.join(repoRoot, 'examples', 'postgres-ticket-queue-reference');
if (!existsSync(path.join(reference, 'package.json'))) throw new Error('PostgreSQL Golden Path reference is missing.');
const { compileNamedParameters } = await import(pathToFileURL(path.join(repoRoot, 'packages', 'named-parameters', 'dist', 'compiler.js')).href);
const { bindNamedParameters } = await import(pathToFileURL(path.join(repoRoot, 'packages', 'named-parameters', 'dist', 'index.js')).href);
const canonicalSql = readFileSync(path.join(reference, 'src', 'tickets', 'list.sql'), 'utf8');
const statement = compileNamedParameters(canonicalSql);
const bound = bindNamedParameters(statement, {
  status: null, customerId: null, assigneeMode: 'any', assigneeId: null, limit: 1, offset: 0,
});
if (!bound.sql.includes('$1') || bound.values.length !== 6) throw new Error('Golden Path direct compilation/binding smoke failed.');
console.log('Golden Path functional fixture direct compilation/binding passed. Live PostgreSQL verification is run by the reference verification command.');
