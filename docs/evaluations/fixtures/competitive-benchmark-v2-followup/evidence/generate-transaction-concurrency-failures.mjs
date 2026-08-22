import { readFileSync } from 'node:fs';

const input = new URL('./results.json', import.meta.url);
const results = JSON.parse(readFileSync(input, 'utf8')).results;
const arms = [
  ['A', 'Minimum Ashiba v1'],
  ['P', 'Prisma'],
  ['S', 'sqlc'],
  ['D', 'Drizzle'],
  ['K', 'Kysely'],
];
const classes = [
  'PostgreSQL behavior incorrect',
  'no callable boundary',
  'treatment fallback/bypass',
  'dependency/setup',
  'serialization/codec',
  'unknown/insufficient',
];
const clean = (value) => String(value ?? 'No failure')
  .replaceAll('|', '\\|')
  .replaceAll(/\r?\n/g, ' ');
const evidence = (row) => `runner-owned; ${row.source_hashes.runner_record_sha256.slice(0, 12)}`;
const rows = results.map((row) =>
  `| ${row.arm} | ${row.run_id} | ${row.live_postgresql_result} | ${row.treatment_fidelity} | ${row.strict_result} | ${clean(row.first_failed_assertion)} | ${evidence(row)} |`,
);
const matrix = classes.map((failureClass) => {
  const values = arms.map(([arm]) => results.filter((row) => row.arm === arm && row.failure_class === failureClass).length);
  return `| ${failureClass} | ${values.join(' | ')} | ${values.reduce((sum, value) => sum + value, 0)} |`;
});
const noFailure = arms.map(([arm]) => results.filter((row) => row.arm === arm && row.failure_class == null).length);
matrix.push(`| no primary failure recorded | ${noFailure.join(' | ')} | ${noFailure.reduce((sum, value) => sum + value, 0)} |`);
const count = (rows, field, value) => rows.filter((row) => row[field] === value).length;
const aggregates = ['T1', 'T2', 'W5', 'All workloads (bookkeeping only)'].map((workload) => {
  const rowsForWorkload = workload.startsWith('All') ? results : results.filter((row) => row.workload === workload);
  return `| ${workload} | ${rowsForWorkload.length} | ${count(rowsForWorkload, 'strict_result', 'P')} | ${count(rowsForWorkload, 'strict_result', 'F')} | ${count(rowsForWorkload, 'strict_result', 'U')} | ${count(rowsForWorkload, 'live_postgresql_result', 'P')} | ${count(rowsForWorkload, 'live_postgresql_result', 'F')} | ${count(rowsForWorkload, 'live_postgresql_result', 'U')} |`;
});

process.stdout.write(`<!-- Generated from results.json by generate-transaction-concurrency-failures.mjs. Do not hand edit. -->
# Transaction and concurrency failure ledger

This ledger is a view of the 30 scored cells in [results.json](./results.json). ` +
`\`Live\` is the independent PostgreSQL behavioral oracle; \`Treatment\` is workflow fidelity; ` +
`\`Strict\` combines them as defined in that JSON file. The runner-owned record hash in the final column identifies the raw record captured before durable summarization.

| Arm | Run | Live | Treatment | Strict | Primary failure | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
${rows.join('\n')}

## Machine-derived result aggregates

The following counts are calculated directly from results.json; they are not an independently maintained report table. Run node summarize-results.mjs for the same data in JSON form and its structural assertions. The all-workloads row is bookkeeping only, not a benchmark score.

| Workload | Cells | Strict P | Strict F | Strict U | Live P | Live F | Live U |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
${aggregates.join('\n')}

## Primary failure-class matrix

The matrix classifies one primary outcome per cell. A behavioral failure can coexist with a treatment mismatch; the per-cell table retains both axes. ` +
`\`unknown/insufficient\` is reserved for a scored result whose first failure cannot be placed in a more specific class (there are none in this capture).

| Failure class | A | Prisma | sqlc | Drizzle | Kysely | Total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
${matrix.join('\n')}
`);
