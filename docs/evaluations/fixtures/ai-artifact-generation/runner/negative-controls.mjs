import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyArtifact } from '../verifier.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const fixtureRoot = path.join(root, '..');
const original = JSON.parse(readFileSync(path.join(fixtureRoot, 'candidates', 'replicate-6', 'artifact.json'), 'utf8'));
const clone = () => structuredClone(original);
const cases = [];
const mechanical = [
  ['stale sourceHash', (a) => { a.artifacts['w3-sort'].sourceHash = 'sha256:0000000000000000000000000000000000000000000000000000000000000000'; }],
  ['range plus one', (a) => { a.artifacts['w2-optional-search'].optional[0].compiledRemovalRange.end += 1; }],
  ['range minus one', (a) => { a.artifacts['w2-optional-search'].optional[0].compiledRemovalRange.start -= 1; }],
  ['out of bounds range', (a) => { a.artifacts['w2-optional-search'].optional[0].compiledRemovalRange.end = 999999; }],
  ['range text mismatch', (a) => { a.artifacts['w2-optional-search'].optional[0].compiledRemovalRange.text = 'wrong'; }],
  ['overlapping ranges', (a) => { a.artifacts['w2-optional-search'].optional[1].compiledRemovalRange.start = a.artifacts['w2-optional-search'].optional[0].compiledRemovalRange.start; }],
  ['orderedNames missing', (a) => { a.artifacts['w1-named-lexical'].orderedNames.pop(); }],
  ['placeholder sequence mismatch', (a) => { a.artifacts['w3-sort'].sql = a.artifacts['w3-sort'].sql.replace('$2', '$3'); }],
  ['sort insertion outside source', (a) => { a.artifacts['w3-sort'].sort.insertion.index = 999999; }],
];
for (const [name, mutate] of mechanical) {
  const artifact = clone(); mutate(artifact);
  const errors = verifyArtifact(artifact);
  cases.push({ category: 'mechanical', name, verifierRejected: errors.length > 0, errors });
}
for (const [name, mutate] of [
  ['adjacent valid predicate declared as assignee', (a) => { const e = a.artifacts['w2-optional-search']; e.optional[0].control = 'customer_id'; }],
  ['wrong but finite priority expression', (a) => { a.artifacts['w2-optional-search'].sort.keys.priority = 'w.name'; }],
]) {
  const artifact = clone(); mutate(artifact);
  const errors = verifyArtifact(artifact);
  cases.push({ category: 'semantic-locally-valid', name, verifierRejected: errors.length > 0, errors });
}
const output = { candidate: 'replicate-6', cases, mechanicalAllRejected: cases.filter((entry) => entry.category === 'mechanical').every((entry) => entry.verifierRejected), semanticVerifierAccepted: cases.filter((entry) => entry.category === 'semantic-locally-valid').every((entry) => !entry.verifierRejected) };
const outputDir = path.join(fixtureRoot, 'negative-control-results');
mkdirSync(outputDir, { recursive: true });
writeFileSync(path.join(outputDir, 'results.json'), `${JSON.stringify(output, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
process.exitCode = output.mechanicalAllRejected && output.semanticVerifierAccepted ? 0 : 1;
