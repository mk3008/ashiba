import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyArtifact } from '../verifier.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const candidate = process.argv[2];
const brownfield = process.argv.includes('--brownfield');
if (!candidate || !/^[a-z0-9-]+$/.test(candidate)) throw new Error('usage: node runner/submit.mjs <candidate-name>');
const artifactPath = path.join(root, '..', 'candidates', candidate, brownfield ? 'brownfield-artifact.json' : 'artifact.json');
const ledgerPath = path.join(root, '..', 'dispatch-ledger.jsonl');
const startedAt = new Date().toISOString();
let result;
try {
  if (!existsSync(artifactPath)) throw new Error('artifact.json is missing');
  const requiredIds = brownfield ? ['m1-parameter-order', 'm2-add-optional', 'm3-format-comment', 'm4-sort-case', 'm5-cte-join'] : undefined;
  const errors = verifyArtifact(JSON.parse(readFileSync(artifactPath, 'utf8')), requiredIds);
  result = { ok: errors.length === 0, errors };
} catch (error) {
  result = { ok: false, errors: [error instanceof Error ? error.message : String(error)] };
}
appendFileSync(ledgerPath, `${JSON.stringify({ at: startedAt, candidate, treatment: brownfield ? 'brownfield' : 'greenfield', artifactPath: `candidates/${candidate}/${brownfield ? 'brownfield-artifact.json' : 'artifact.json'}`, ...result })}\n`);
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
process.exitCode = result.ok ? 0 : 1;
