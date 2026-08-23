// O0 control: deliberately deterministic owned tooling derives one global asset.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lowerNamedParameters } from './g1-lower.mjs';
const fixture = dirname(dirname(fileURLToPath(import.meta.url)));
const sourcePath = 'queries/search.sql';
const sql = readFileSync(join(fixture, sourcePath), 'utf8');
const text = 'AND o.status = :status';
const output = { sourcePath, sourceHash: createHash('sha256').update(sql).digest('hex'), optional: [{ id: 'status', start: sql.indexOf(text), end: sql.indexOf(text) + text.length, text }], sort: { anchor: '/* @sort:search */', keys: ['newest', 'oldest'] }, g1: lowerNamedParameters(sql) };
console.log(JSON.stringify(output, null, 2));
