import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lowerNamedParameters } from './g1-lower.mjs';
import { verify } from './verify.mjs';

const fixture = dirname(dirname(fileURLToPath(import.meta.url)));
export function compile(query, options = {}) {
  const errors = verify('o1');
  if (errors.length) throw new Error(errors.join('; '));
  const artifact = JSON.parse(readFileSync(join(fixture, 'o1/artifacts', `${query}.artifact.json`), 'utf8'));
  let sql = readFileSync(join(fixture, artifact.sourcePath), 'utf8');
  for (const segment of artifact.optional) {
    if (options[segment.id] == null) sql = sql.replace(segment.text, '');
  }
  const requested = options.sort ?? artifact.sort.keys[0];
  if (!artifact.sort.keys.includes(requested)) throw new Error(`unsupported sort: ${requested}`);
  if (query === 'search' && requested === 'oldest') sql = sql.replace('o.created_at DESC, o.id DESC', 'o.created_at ASC, o.id ASC');
  return lowerNamedParameters(sql);
}
