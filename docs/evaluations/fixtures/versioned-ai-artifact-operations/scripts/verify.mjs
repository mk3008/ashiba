import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const fixture = dirname(root);
const sha256 = (text) => createHash('sha256').update(text).digest('hex');
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

export function verify(mode = 'o1') {
  if (mode === 'o2') return ['O2_REJECTED: clean build would require AI; no versioned derived artifact exists'];
  const manifestPath = join(fixture, mode, 'manifest.json');
  if (!existsSync(manifestPath)) return [`MISSING_MANIFEST: ${mode}/manifest.json`];
  const listed = readJson(manifestPath).artifacts;
  const errors = [];
  const artifactDir = join(fixture, mode, 'artifacts');
  const actual = existsSync(artifactDir) ? readdirSync(artifactDir).filter((file) => file.endsWith('.json')).map((file) => `artifacts/${file}`).sort() : [];
  for (const file of actual) if (!listed.includes(file)) errors.push(`ORPHAN_ARTIFACT: ${file}`);
  for (const entry of listed) {
    const path = join(fixture, mode, entry);
    if (!existsSync(path)) { errors.push(`MISSING_ARTIFACT: ${entry}`); continue; }
    const artifact = readJson(path);
    const source = join(fixture, artifact.sourcePath);
    if (!existsSync(source)) { errors.push(`MISSING_SOURCE: ${entry} -> ${artifact.sourcePath}`); continue; }
    const sql = readFileSync(source, 'utf8');
    if (artifact.sourceHash !== sha256(sql)) errors.push(`SOURCE_HASH_MISMATCH: ${entry}`);
    for (const optional of artifact.optional ?? []) {
      if (!Number.isInteger(optional.start) || !Number.isInteger(optional.end) || optional.start < 0 || optional.end <= optional.start || optional.end > sql.length) {
        errors.push(`INVALID_RANGE: ${entry}:${optional.id}`); continue;
      }
      if (sql.slice(optional.start, optional.end) !== optional.text) errors.push(`RANGE_TEXT_MISMATCH: ${entry}:${optional.id}`);
    }
    const anchor = artifact.sort?.anchor;
    if (!anchor || sql.indexOf(anchor) < 0 || sql.indexOf(anchor) !== sql.lastIndexOf(anchor)) errors.push(`SORT_ANCHOR_MISMATCH: ${entry}`);
    if (!Array.isArray(artifact.sort?.keys) || artifact.sort.keys.length === 0) errors.push(`INVALID_SORT_POLICY: ${entry}`);
  }
  return errors;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const errors = verify(process.argv[2] ?? 'o1');
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
  else console.log('VERIFY_OK');
}
