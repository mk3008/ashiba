# SQL-resource final ownership ablation harness

This bounded harness compares three ways to review a SQL fleet without changing Ashiba product code:

* Arm A writes two JSON snapshots to a temporary directory and invokes the current `compareSqlResourceSnapshotFiles` implementation.
* Arm B uses ordinary hash/path evidence equivalent to a `git diff` plus `rg` candidate scan and persists no fleet artifact.
* Arm C derives parameter, dependency, result, and source facts from the before/after SQL in memory, using the named-parameter compiler, and persists no fleet artifact.

The fixture contains realistic SQL shape (CTE, aliases, joins, nullable filters, literals, pagination) and runs at 20, 300, and 3000 query scales. It exercises formatting/comment-only, semantic predicate, parameter, result, table, column, add, and remove changes.

Run from the repository root:

```bash
pnpm exec vitest run docs/evaluations/sql-resource-final-ownership/evaluation/ablation.test.ts
```

The test writes `raw-results.json` next to this file. Snapshot files are temporary and are removed after each scale. The output is evidence for ownership evaluation, not a replacement public API or a claim that synthetic contracts replace PostgreSQL live verification.
