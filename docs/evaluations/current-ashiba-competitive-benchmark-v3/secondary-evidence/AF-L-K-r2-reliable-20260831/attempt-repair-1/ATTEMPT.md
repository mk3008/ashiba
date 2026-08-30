# AF-L-K-r2 repair 1 and final result

Repair 1 corrected only the candidate's Kysely database type declarations:
the PostgreSQL identity columns are `Generated<string>` rather than
insert-required. It did not alter the frozen layered seams, runner, packet,
DDL, or API.

## Verification

| Check | Result |
| --- | --- |
| Candidate strict typecheck | PASS (`tsc --noEmit`, exit 0) |
| Candidate build | PASS (`tsc`, exit 0) |
| Primary G1 runner-owned PostgreSQL oracle | PASS |
| Primary static isolation | PASS (zero findings) |
| AF-L baseline integrity | PASS |
| Source unchanged during AF runner | PASS |
| Architecture delta completeness | PASS |
| Runner-owned fixture cleanup | PASS (schema, role, connection) |

The raw AF record, nested primary G1 record, and primary pre-cleanup database
state are preserved in `external-evidence/`. The final source snapshot is
stored separately at
`secondary-candidate-snapshots/AF-L-K-r2-reliable-20260831/final`.

## Observed architecture delta

The candidate changed only the frozen `src/application.ts` entrypoint and
added the arm packet's `package.json` and lockfile. It did not change the
pool, transaction, DTO, or test seams; did not add global/config/generated
directories; and its required treatment guarantee was the Kysely typed
query-builder API.

## Repair accounting

* Initial attempt: failed typecheck/build because Kysely identity insert types
  were modeled as required.
* Candidate repair 1: type-model correction, then full PASS.
* Candidate repair 2: not used.
* Environment repairs: 0.
* Harness repairs: 0.
