# AF-V-S-r2 reliable run summary

## Cell result

`F` — final AF runner status is `F` before PostgreSQL oracle setup.

## Fresh isolation and packet integrity

- Candidate root: `C:\tmp\ashiba-benchmark-v3-secondary\AF-V-S-r2-reliable-v013-20260831\candidate`
- Candidate, npm cache, evidence root, and external artifact root were private to this cell.
- The initial untouched source snapshot was preserved before candidate mutation.
- Packet artifact fetcher verified sqlc `v1.31.1` (`352711fa…5429f`) and
  `sqlc-gen-typescript` `v0.1.3` (`287df8f…1a9368`) before the scored initial
  attempt.
- Shared packet and runner were only read; no product or protocol file changed.

## Attempts

| Attempt | Result | Evidence |
| --- | --- | --- |
| Initial | F | `attempt-initial/` source plus typecheck log: positional parameters in SQL produced invalid TypeScript members in the early-access TypeScript plugin output. |
| Repair 1 | F | `attempt-repair1/` source plus generation log: `sqlc.arg(limit)` used a reserved token and the generator stopped with a parser error. |
| Repair 2 / final | F | strict typecheck and build passed; AF/primary runner stopped at static inspection because candidate-local `src/tickets/sql/schema.sql` matched the runner-owned DDL prohibition. |

The earlier `0.1.2` setup directory is preserved separately as an excluded,
pre-execution protocol incident. It did not run `sqlc generate`, candidate
verification, or the runner and is not an attempt in this table.

## Required final evidence

- Strict TypeScript: pass (`final-typecheck-reconfirmation.log`).
- Candidate tests: no test script was supplied by the frozen S arm package;
  recorded as `not-configured` in `candidate-tests.json`, not treated as pass.
- Build: pass (`repair2-build.log`).
- Generated sqlc TypeScript: present at `src/tickets/generated/queries_sql.ts`.
- Primary G1/live oracle: not run; primary runner failed at static inspection.
- Static inspection: fail, `runner-ddl` at candidate-local
  `src/tickets/sql/schema.sql`.
- Architecture delta: complete and recorded by `runner.json`; feature-local SQL
  is `yes`, pool/transaction/DTO/test seams remained unchanged, and the final
  generated directory/config additions are observable.
- Runner-owned cleanup: `not-run`, because schema setup never began.

All candidate source, pre-action, failure, final runner, primary-runner, build,
generation, and typecheck evidence has been copied into the repository evidence
paths before any external clean-room cleanup.
