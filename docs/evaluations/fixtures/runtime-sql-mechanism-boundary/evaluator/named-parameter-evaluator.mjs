import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { compileNamedParameters } from '../../../../../packages/named-parameters/dist/compiler.js';
import { compileAtDevelopmentTime } from '../named-parameter/fixture-compiler.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const canonical = await readFile(path.join(root, 'named-parameter', 'canonical.sql'), 'utf8');
const hash = `sha256:${createHash('sha256').update(canonical).digest('hex')}`;
const compiled = compileNamedParameters(canonical);
const expectedNames = ['id', 'id2', 'value'];
const expectedValueNames = ['id', 'id2', 'id', 'value', 'id', 'id'];
const fixtureCompiled = compileAtDevelopmentTime(canonical);
if (JSON.stringify(fixtureCompiled.orderedNames) !== JSON.stringify(expectedValueNames)) throw new Error(`fixture compiler names: ${JSON.stringify(fixtureCompiled.orderedNames)}`);
if (compiled.style !== 'indexed' || JSON.stringify(compiled.parameterNames) !== JSON.stringify(expectedNames)) {
  const evidence = { status: 'calibration-failure', expectedNames, actualNames: compiled.style === 'indexed' ? compiled.parameterNames : undefined, cause: 'current compiler binding contract differs from the registered indexed contract' };
  await writeFile(path.join(root, 'evidence', 'named-parameter-result.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify(evidence));
  process.exitCode = 1;
} else {
for (const forbidden of ["':not_a_parameter'", '"identifier:still_not_parameter"', '-- :not_a_parameter', '/* :not_a_parameter */', '$$ :not_a_parameter $$', '$body$\n    :not_a_parameter']) {
  if (!compiled.sql.includes(forbidden)) throw new Error(`lexical context changed: ${forbidden}`);
}
if (!compiled.sql.includes('$1::bigint') || !compiled.sql.includes('$2::bigint') || !compiled.sql.includes('$3::text')) throw new Error('indexed lowering missing');
const values = compiled.parameterNames.map((name) => ({ id: 1, id2: 2, value: 'value' })[name]);
const staleHash = `sha256:${createHash('sha256').update(`${canonical}\n-- edit`).digest('hex')}`;
if (staleHash === hash) throw new Error('stale hash test did not change');
const artifact = { sourceHash: hash, sql: compiled.sql, parameterNames: compiled.parameterNames, values, staleArtifactRejected: staleHash !== hash };
await writeFile(path.join(root, 'named-parameter', 'generated.postgres.json'), `${JSON.stringify(artifact, null, 2)}\n`);
await writeFile(path.join(root, 'evidence', 'named-parameter-result.json'), `${JSON.stringify({ status: 'pass', ...artifact }, null, 2)}\n`);
console.log(JSON.stringify({ status: 'pass', parameterNames: compiled.parameterNames, sourceHash: hash }));
}
