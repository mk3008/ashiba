# AF-V-K-r2 initial and final result

The initial independent candidate implemented the supplied G1 assignment using
the installed Kysely PostgreSQL dialect, Kysely query builder, and Kysely
transaction API. The implementation is feature-local under the frozen ticket
vertical slice; the entrypoint only delegates into that slice.

## Verification

| Check | Result |
| --- | --- |
| Candidate strict typecheck | PASS (`tsc --noEmit`, exit 0) |
| Candidate build | PASS (`tsc`, exit 0) |
| Primary G1 runner-owned PostgreSQL oracle | PASS |
| Primary static isolation | PASS (zero findings) |
| AF-V baseline integrity | PASS |
| Source unchanged during AF runner | PASS |
| Architecture delta completeness | PASS |
| Runner-owned fixture cleanup | PASS (schema, role, connection) |

The raw AF record, nested primary G1 record, and primary pre-cleanup database
state are preserved in `external-evidence/`. The final source snapshot is
stored separately at
`secondary-candidate-snapshots/AF-V-K-r2-reliable-20260831/final`.

## Observed architecture delta

The candidate changed the entrypoint and the feature-local ticket use-case
seam. It added the arm packet's `package.json` and lockfile but did not change
the frozen pool, transaction, DTO, or test seams; it introduced no
global/config/generated directory. The runner recorded Kysely's typed
query-builder API as the required treatment guarantee.

## Repair accounting

* Initial attempt: PASS.
* Candidate repairs: 0 of 2 permitted.
* Environment repairs: 0.
* Harness repairs: 0.
