import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const evidenceDir = path.dirname(fileURLToPath(import.meta.url));
const results = JSON.parse(await readFile(path.join(evidenceDir, 'results.json'), 'utf8'));
if (results.evaluatorVersion !== 6) throw new Error(`expected evaluator v6, received v${results.evaluatorVersion}`);
if (results.scoredCells.length !== 6) throw new Error('expected six timebox-controlled scored cells');
const ledger = await readFile(path.join(evidenceDir, 'dispatch-ledger.md'), 'utf8');
const summary = {};
for (const cell of results.scoredCells) {
  const record = JSON.parse(await readFile(path.join(evidenceDir, cell.runnerRecord), 'utf8'));
  if (record.candidateId !== cell.id || record.pass !== true || cell.strict !== 'P') {
    throw new Error(`runner record is not a strict pass: ${cell.id}`);
  }
  const ledgerId = cell.id.replace(/^g(\d)-r/, 'G$1-r');
  const line = ledger.split('\n').find((value) => value.startsWith(`| ${ledgerId} `));
  if (!line?.includes('pass v6')) {
    throw new Error(`dispatch ledger does not record v6 pass: ${cell.id}`);
  }
  summary[cell.treatment] = (summary[cell.treatment] ?? 0) + 1;
}
if (summary.G0 !== 2 || summary.G1 !== 2 || summary.G2 !== 2) throw new Error('treatment totals mismatch');
console.log(JSON.stringify({ evaluatorVersion: results.evaluatorVersion, strictPasses: summary }));
