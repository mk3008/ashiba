# Preregistration amendment 3: invalidate and re-freeze the pre-scoring packet

## Status at correction

This amendment is user-preserving, not result-driven. At the time of the
independent audit, the primary scored-cell count was **0**. The initial
execution packet freeze (`166a633`) and its controls are retained as evidence,
but are not an eligible scoring protocol.

## Why the packet is invalidated

The independent audit found pre-scoring P0 defects: the Prisma prompt still
named Prisma 7, negative controls were incomplete, the candidate received an
over-privileged database URL, the runner lacked immutable attempt evidence,
the packet verifier was not fail-closed, the source inspection only covered a
built entrypoint, primary workload prompts required unrelated operations, and
the T2 start race was not deterministically coordinated. The packet also
included raw HTML snapshots that fail whitespace checks.

No cell may be scored under packet v1. All v1 reference-control results remain
calibration evidence only; they are not candidate results.

## Requirements for packet v2 before scoring

1. The Prisma arm is exactly Prisma 8 RC/current-generation (`prisma`
   `8.0.0-rc.12`, `@prisma/orm-postgres` `8.0.0-rc.8`) throughout every
   prompt, lock, official packet, and treatment review.
2. Runner-owned negative candidates must demonstrate rejection of wrong
   namespace/result, hostile-value behaviour, invalid-sort acceptance, partial
   transaction commit, duplicate claim, and fabricated/missing API evidence.
3. A candidate receives a least-privilege, nonce-schema-only database role;
   search path and statement timeout are runner-controlled. The report must
   describe any operating-system isolation limitation rather than overclaim it.
4. T2 uses a runner-owned concurrent-start barrier and preserves its negative
   control.
5. Evidence is written and hashed before fixture cleanup: candidate source,
   entrypoint, dependency lock, prompts/packet hashes, command logs,
   stdout/stderr, first-pass state, treatment review, runner result, and final
   state summary with credential redaction.
6. The packet verifier checks committed expected hashes and fails nonzero on
   mismatch; required sqlc artifacts are downloaded and digest-verified before
   a sqlc cell.
7. Candidate root and built entrypoint are separate inputs; static/treatment
   inspection covers source, config, SQL, generated state, and lockfiles.
8. G1/T1/T2/Q1 use exact operation-limited prompts. Maintenance, AF-V/AF-L,
   X1, schema-drift, and exit-control packets must be frozen before their own
   execution and cannot be silently folded into a primary cell.

The next committed packet freeze SHA is the sole `executionPacketFreezeSha`
for scored results. This amendment retains the original preregistration and
amendments 1–2 unchanged.
