import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const fixture = dirname(dirname(fileURLToPath(import.meta.url)));
const hash = (text) => createHash('sha256').update(text).digest('hex');
const json = (path) => JSON.parse(readFileSync(path, 'utf8'));

export function verify() {
  const manifest = json(join(fixture, 'manifest.json'));
  const errors = [];
  const actual = readdirSync(join(fixture, 'artifacts')).filter((name) => name.endsWith('.json')).map((name) => `artifacts/${name}`);
  for (const artifactPath of actual) if (!manifest.artifacts.includes(artifactPath)) errors.push(`ORPHAN_ARTIFACT: ${artifactPath}`);
  for (const artifactPath of manifest.artifacts) {
    const fullArtifact = join(fixture, artifactPath);
    if (!existsSync(fullArtifact)) { errors.push(`MISSING_ARTIFACT: ${artifactPath}`); continue; }
    const artifact = json(fullArtifact); const source = join(fixture, artifact.sourcePath);
    if (!existsSync(source)) { errors.push(`MISSING_SOURCE: ${artifactPath}`); continue; }
    const sql = readFileSync(source, 'utf8'); const placement = artifact.sortInsertion;
    if (artifact.sourceHash !== hash(sql)) errors.push(`SOURCE_HASH_MISMATCH: ${artifactPath}`);
    if (!Number.isInteger(placement?.index) || placement.index < 0 || placement.index + placement.expectedText.length > sql.length) errors.push(`INVALID_INDEX: ${artifactPath}`);
    else {
      if (sql.slice(placement.index, placement.index + placement.expectedText.length) !== placement.expectedText) errors.push(`EXPECTED_TEXT_MISMATCH: ${artifactPath}`);
      const beforeStart = placement.index - placement.beforeText.length;
      if (beforeStart < 0 || sql.slice(beforeStart, placement.index) !== placement.beforeText) errors.push(`BEFORE_CONTEXT_MISMATCH: ${artifactPath}`);
      const afterStart = placement.index + placement.expectedText.length;
      if (sql.slice(afterStart, afterStart + placement.afterText.length) !== placement.afterText) errors.push(`AFTER_CONTEXT_MISMATCH: ${artifactPath}`);
    }
  }
  return errors;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) { const errors = verify(); if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; } else console.log('VERIFY_OK'); }
