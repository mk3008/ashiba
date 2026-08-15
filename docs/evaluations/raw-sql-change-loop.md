---
title: Raw SQL Change Loop Measurement
---

# Raw SQL Change Loop Measurement

This record measures the deterministic development loop introduced by `ashiba check --fix-generated`. It uses the mutation fixtures in `packages/cli/tests/raw-sql-gates.test.ts`; it does not treat static analysis as proof of database execution.

## Method

The baseline is the pre-change documented workflow and command ownership:

1. `ashiba feature query refresh <feature> <query>`
2. `ashiba feature tests check --fix`
3. `ashiba check`
4. edit the application-owned `query.ts`
5. `ashiba check --full`

The new workflow is:

1. `ashiba check --fix-generated`
2. edit only the application-owned files listed by the diagnostic
3. `ashiba check --full`

Command counts below count Ashiba invocations, not the application edit. Changed-file counts include the canonical SQL or DDL edit, generated refresh output, and the required `query.ts` edit. Review-file counts are deliberately not reduced: generated diffs still require review.

## Results

| Mutation | Baseline commands | New commands | Generated files refreshed | Total files changed | Baseline files to read/review | New files to read/review | Concise application diagnostics | First strong rejection |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| DDL column rename | 4 | 2 | 4 | 6 | 6 | 6 | 1 | baseline command 3; new command 1 |
| DDL nullable to non-null | 4 | 2 | 3 | 5 | 5 | 5 | 1 | baseline command 3; new command 1 |
| SELECT projection add | 4 | 2 | 4 | 6 | 6 | 6 | 1 | baseline command 3; new command 1 |
| SELECT projection remove | 4 | 2 | 4 | 6 | 6 | 6 | 1 | baseline command 3; new command 1 |

The first command now refreshes only generated-owned files and returns the remaining `query.ts` work in the same result. It does not modify canonical `.sql`, DDL, or application-owned source.

## Interpretation

The read/review counts cover every changed file in the final diff; they do not claim that a diagnostic lets a reviewer skip generated evidence. The improvement is a reduction in command round trips and rediscovery, not a claim that VSA requires fewer reviewable artifacts. The query-local generated metadata, runtime SQL snapshot, and mapping evidence remain separate, so the final diff has the same review surface. Consolidating them could reduce file count, but that is not required to make the change loop deterministic and would be a separate compatibility decision.

Offline rejection proves detectable contract drift only. `ashiba check --full` remains the DB-backed mapper lane, and application integration tests remain responsible for source-query behavior, constraints, locking, transactions, and real database semantics.
