import { execFileSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const candidateRoot = process.cwd();
const packetSchema = resolve(candidateRoot, '../packet/schema.sql');
const temporarySchema = resolve(candidateRoot, 'sqlc-input-schema.sql');
const schema = readFileSync(packetSchema, 'utf8');
const tableMarker = '{{schema}}.work_items';
const tableMarkerOffset = schema.indexOf(tableMarker);
const declarationStart = schema.lastIndexOf('CREATE ', tableMarkerOffset);
const declarationEnd = schema.indexOf('\n);', tableMarkerOffset);
const workItems = declarationStart >= 0 && declarationEnd >= 0
  ? schema.slice(declarationStart, declarationEnd + 3)
  : undefined;

if (!workItems) {
  throw new Error('Could not locate work_items in the supplied packet schema');
}

writeFileSync(
  temporarySchema,
  `-- Temporary sqlc input projected from ../packet/schema.sql\n${workItems.replace('{{schema}}.', '')}\n`,
);

try {
  execFileSync(
    'docker',
    [
      'run',
      '--rm',
      '-v',
      `${candidateRoot}:/src`,
      '-w',
      '/src',
      'sqlc/sqlc:1.31.1',
      'generate',
    ],
    { stdio: 'inherit' },
  );
} finally {
  rmSync(temporarySchema, { force: true });
}
