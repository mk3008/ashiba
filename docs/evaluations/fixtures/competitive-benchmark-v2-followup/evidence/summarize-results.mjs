import { readFileSync } from 'node:fs';

const document = JSON.parse(readFileSync(new URL('./results.json', import.meta.url), 'utf8'));
const results = document.results;
const dimensions = ['strict_result', 'live_postgresql_result', 'treatment_fidelity'];
const count = (rows, dimension) => Object.fromEntries(
  [...new Set(rows.map((row) => row[dimension]))].sort().map((value) => [
    value,
    rows.filter((row) => row[dimension] === value).length,
  ]),
);
const summarize = (rows) => Object.fromEntries(dimensions.map((dimension) => [dimension, count(rows, dimension)]));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(results.length === 30, `expected 30 scored cells, found ${results.length}`);
assert(new Set(results.map((row) => row.run_id)).size === results.length, 'run_id values must be unique');
for (const row of results) {
  assert(row.evidence_source === 'runner-owned', `${row.run_id}: non-runner evidence`);
  assert(row.source_hashes?.runner_record_sha256, `${row.run_id}: runner record hash missing`);
  assert(row.strict_result !== 'P' || (row.live_postgresql_result === 'P' && row.treatment_fidelity === 'pass'), `${row.run_id}: invalid strict P`);
  assert(row.strict_result !== 'U' || row.live_postgresql_result === 'U', `${row.run_id}: invalid strict U`);
}

const workloads = Object.fromEntries([...new Set(results.map((row) => row.workload))]
  .sort()
  .map((workload) => [workload, summarize(results.filter((row) => row.workload === workload))]));
const output = {
  input: 'results.json',
  cells: results.length,
  by_workload: workloads,
  bookkeeping_only_all_workloads: summarize(results),
};
process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
