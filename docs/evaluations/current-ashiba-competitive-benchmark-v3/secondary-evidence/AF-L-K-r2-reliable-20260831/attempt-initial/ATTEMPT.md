# AF-L-K-r2 initial attempt

The initial candidate used Kysely's PostgreSQL dialect and query/transaction
APIs from the supplied arm packet within the frozen layered skeleton. Its
candidate source and direct typecheck/build logs were copied into the
repository before any repair.

## Result

`tsc --noEmit` and `tsc` both exited `2`; the complete compiler output is
preserved under `external-evidence/`. The candidate model declared identity
columns as insert-required, so Kysely rejected the `tickets` and
`ticket_audit` insert objects because `id` and `audit_id` were absent.

No AF runner invocation occurred because there was no built entrypoint. This
is a candidate type-system/API-use repair, not an environment or harness
incident. One bounded repair remains available after repair 1; the protocol
cap is two repairs total.

## Preservation

The source snapshot, stdout, and stderr are durable and disjoint from the
external candidate root. No runner fixture or database state exists for this
attempt.
