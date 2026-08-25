import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { compileNamedParameters } from '@ashiba-ts/named-parameters/compiler';

const root = process.cwd();
const files = { list: 'src/tickets/list.sql', get: 'src/tickets/get.sql', assign: 'src/tickets/assign.sql', audit: 'src/tickets/audit.sql' };
const entries = Object.fromEntries(Object.entries(files).map(([id, file]) => {
  const sql = readFileSync(resolve(root, file), 'utf8').replace(/\r\n?/g, '\n');
  const binding = compileNamedParameters(sql, { rendering: { style: 'indexed', prefix: '$' } });
  return [id, binding];
}));
mkdirSync(resolve(root, 'src/generated'), { recursive: true });
writeFileSync(resolve(root, 'src/generated/queries.ts'), `// Generated from canonical .sql by Ashiba. Do not edit.\nexport const queries = ${JSON.stringify(entries, null, 2)} as const;\n`);
