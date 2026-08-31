# Adoption decision matrix

This matrix is intentionally conservative. `INSUFFICIENT-EVIDENCE` means the
benchmark should not turn an unmeasured condition into product guidance.

**Observed primary context.** First/terminal-attempt P counts are A 4/7,
P 6/8, D 8/8, K 6/8, and G 7/7, each out of eight cells. sqlc is not pooled:
six of eight cells used 0.1.2 rather than the frozen 0.1.3 plugin. These are
descriptive counts, not an aggregate score or a causal explanation for
retained attempts. Exact per-cell sources and the eligibility screen are in
[raw-results.json](./raw-results.json), [RESULT_MATRICES.md](./RESULT_MATRICES.md),
and [PRIMARY_RESULT_CORRECTION.md](./PRIMARY_RESULT_CORRECTION.md).

| Scenario | Current Ashiba | Prisma 8 RC | sqlc TS | Drizzle | Kysely | native pg | Basis/status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Bounded AI-assisted PostgreSQL business work | VIABLE-WITH-TRADEOFFS | VIABLE-WITH-TRADEOFFS | INSUFFICIENT-EVIDENCE | VIABLE-WITH-TRADEOFFS | VIABLE-WITH-TRADEOFFS | VIABLE-WITH-TRADEOFFS | sqlc has no arm-level frozen-0.1.3 primary result; no overall ranking |
| SQL-centric or DB-centric work | VIABLE-WITH-TRADEOFFS | VIABLE-WITH-TRADEOFFS | INSUFFICIENT-EVIDENCE | VIABLE-WITH-TRADEOFFS | VIABLE-WITH-TRADEOFFS | VIABLE-WITH-TRADEOFFS | Q1 is bounded; sqlc 0.1.3 lacks arm-level evidence |
| Existing pg brownfield / VSA / layered | INSUFFICIENT-EVIDENCE | INSUFFICIENT-EVIDENCE | INSUFFICIENT-EVIDENCE | INSUFFICIENT-EVIDENCE | INSUFFICIENT-EVIDENCE | INSUFFICIENT-EVIDENCE | AF r1/r2 records are complete but heterogeneous and non-aggregate; no architecture recommendation |
| Transaction-heavy or concurrency-heavy | VIABLE-WITH-TRADEOFFS | VIABLE-WITH-TRADEOFFS | INSUFFICIENT-EVIDENCE | VIABLE-WITH-TRADEOFFS | VIABLE-WITH-TRADEOFFS | VIABLE-WITH-TRADEOFFS | T1/T2 observations only; sqlc 0.1.3 lacks an eligible arm result |
| Open-ended report builder | INSUFFICIENT-EVIDENCE | INSUFFICIENT-EVIDENCE | INSUFFICIENT-EVIDENCE | INSUFFICIENT-EVIDENCE | INSUFFICIENT-EVIDENCE | INSUFFICIENT-EVIDENCE | X1 H-007 r2 has one corrected terminal record per arm; it remains separate and non-aggregate |
| Schema/migration-centric team | PREFER-ALTERNATIVE | INSUFFICIENT-EVIDENCE | INSUFFICIENT-EVIDENCE | INSUFFICIENT-EVIDENCE | INSUFFICIENT-EVIDENCE | PREFER-ALTERNATIVE | Ashiba/pg do not own migration lifecycle; no ecosystem ranking claimed |
| Multi-DB portability | INSUFFICIENT-EVIDENCE | INSUFFICIENT-EVIDENCE | INSUFFICIENT-EVIDENCE | INSUFFICIENT-EVIDENCE | INSUFFICIENT-EVIDENCE | INSUFFICIENT-EVIDENCE | PostgreSQL-only measured runtime |
| AI-light or human-centric team | INSUFFICIENT-EVIDENCE | INSUFFICIENT-EVIDENCE | INSUFFICIENT-EVIDENCE | INSUFFICIENT-EVIDENCE | INSUFFICIENT-EVIDENCE | INSUFFICIENT-EVIDENCE | Fresh-Agent protocol does not measure human-only adoption |

`VIABLE-WITH-TRADEOFFS` is not `ACTIVELY-RECOMMEND`. It says only that at
least one frozen primary observation passed while other final failures and
unmeasured dimensions remain visible.
