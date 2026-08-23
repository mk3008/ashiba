import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const workloadRoot = path.join(root, 'workloads');
const required = ['w1-named-lexical', 'w2-optional-search', 'w3-sort', 'w4-mixed-complex'];
const brownfieldRequired = ['m1-parameter-order', 'm2-add-optional', 'm3-format-comment', 'm4-sort-case', 'm5-cte-join'];

export function hashSql(sql) {
  return `sha256:${createHash('sha256').update(sql).digest('hex')}`;
}

export function verifyArtifact(artifact, requiredIds = required) {
  const errors = [];
  if (!artifact || artifact.version !== 1 || !artifact.artifacts || typeof artifact.artifacts !== 'object') {
    return ['artifact must contain version: 1 and an artifacts object'];
  }
  const ids = [...new Set([...requiredIds, ...Object.keys(artifact.artifacts)])];
  for (const id of ids) {
    const entry = artifact.artifacts[id];
    if (!entry) { errors.push(`${id}: missing artifact`); continue; }
    const declared = typeof entry.sourceFile === 'string' ? entry.sourceFile : '';
    if (!/^(workloads|brownfield)\/[a-z0-9-]+\.sql$/.test(declared)) { errors.push(`${id}: sourceFile is not a registered workload`); continue; }
    const sourcePath = path.join(root, declared);
    let source;
    try { source = readFileSync(sourcePath, 'utf8'); } catch { errors.push(`${id}: sourceFile is not a registered workload`); continue; }
    if (requiredIds.includes(id) && entry.sourceFile !== `${id.startsWith('m') ? 'brownfield' : 'workloads'}/${id}.sql`) errors.push(`${id}: sourceFile does not match registered workload`);
    if (entry.sourceHash !== hashSql(source)) errors.push(`${id}: stale sourceHash`);
    if (typeof entry.sql !== 'string' || !Array.isArray(entry.orderedNames)) { errors.push(`${id}: sql and orderedNames are required`); continue; }
    const placeholders = [...entry.sql.matchAll(/\$(\d+)/g)].map((match) => Number(match[1]));
    if (placeholders.length !== entry.orderedNames.length) errors.push(`${id}: placeholder count does not equal orderedNames length`);
    for (let index = 0; index < placeholders.length; index += 1) {
      if (placeholders[index] !== index + 1) errors.push(`${id}: placeholder sequence must be $1..$n`);
    }
    verifyRanges(id, source, entry.sql, entry.optional ?? [], errors);
    verifySort(id, entry.sql, entry.sort, errors);
  }
  return errors;
}

function verifyRanges(id, source, sql, branches, errors) {
  const sourceRanges = [];
  const compiledRanges = [];
  for (const branch of branches) {
    if (!branch.control || !branch.sourceRange || !branch.compiledRemovalRange || !branch.presentReplacement) {
      errors.push(`${id}: optional branch lacks control/ranges/replacement`); continue;
    }
    checkRange(`${id}: sourceRange`, source, branch.sourceRange, sourceRanges, errors);
    checkRange(`${id}: compiledRemovalRange`, sql, branch.compiledRemovalRange, compiledRanges, errors);
    const replacement = branch.presentReplacement;
    if (typeof replacement.nullSql !== 'string' || typeof replacement.valueSql !== 'string' || !Array.isArray(replacement.valueNames)) {
      errors.push(`${id}: optional presentReplacement is malformed`);
    }
    for (const name of replacement.valueNames ?? []) {
      if (!replacement.valueSql.includes(`{{param:${name}}}`)) errors.push(`${id}: valueNames must have matching marker`);
    }
  }
}

function checkRange(label, text, range, seen, errors) {
  if (!Number.isInteger(range.start) || !Number.isInteger(range.end) || range.start < 0 || range.end < range.start || range.end > text.length) {
    errors.push(`${label}: out-of-bounds range`); return;
  }
  if (text.slice(range.start, range.end) !== range.text) errors.push(`${label}: range text mismatch`);
  for (const other of seen) if (range.start < other.end && other.start < range.end) errors.push(`${label}: overlapping edit range`);
  seen.push(range);
}

function verifySort(id, sql, sort, errors) {
  if (!sort) return;
  const insertion = sort.insertion;
  if (!insertion || !Number.isInteger(insertion.index) || insertion.index < 0 || insertion.index > sql.length) {
    errors.push(`${id}: sort insertion outside source`); return;
  }
  if (sql.slice(insertion.index, insertion.index + insertion.text.length) !== insertion.text) errors.push(`${id}: sort insertion anchor mismatch`);
  const keys = sort.keys;
  if (!keys || typeof keys !== 'object' || Object.keys(keys).length < 3) errors.push(`${id}: sort must contain three finite keys`);
  for (const [key, expression] of Object.entries(keys ?? {})) {
    if (!key || typeof expression !== 'string' || expression.length === 0) errors.push(`${id}: invalid sort key expression`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const brownfield = process.argv.includes('--brownfield');
  const candidatePath = process.argv.find((argument) => argument !== '--brownfield' && argument !== process.argv[0] && argument !== process.argv[1]);
  if (!candidatePath) throw new Error('usage: node verifier.mjs <artifact.json>');
  const errors = verifyArtifact(JSON.parse(readFileSync(candidatePath, 'utf8')), brownfield ? brownfieldRequired : required);
  process.stdout.write(`${JSON.stringify({ ok: errors.length === 0, errors }, null, 2)}\n`);
  process.exitCode = errors.length === 0 ? 0 : 1;
}
