# Adoption decision matrix

This matrix is intentionally conservative. `INSUFFICIENT-EVIDENCE` means the
benchmark should not turn an unmeasured condition into product guidance.

**Observed primary context.** First-oracle/final-live P counts are A 4/5,
P 6/6, S 3/4, D 8/8, K 6/7, and G 7/7, each out of eight cells. These are
descriptive cell counts, not an aggregate score or a causal explanation for
the retained additional attempts. The exact per-cell first source and terminal
source are preserved in [raw-results.json](./raw-results.json) and summarized
in [RESULT_MATRICES.md](./RESULT_MATRICES.md).

| Scenario | Current Ashiba | Prisma 8 RC | sqlc TS | Drizzle | Kysely | native pg | Basis/status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Bounded AI-assisted PostgreSQL business work | VIABLE-WITH-TRADEOFFS | VIABLE-WITH-TRADEOFFS | VIABLE-WITH-TRADEOFFS | VIABLE-WITH-TRADEOFFS | VIABLE-WITH-TRADEOFFS | VIABLE-WITH-TRADEOFFS | Primary observations exist for every arm; no overall ranking |
| SQL-centric or DB-centric work | VIABLE-WITH-TRADEOFFS | VIABLE-WITH-TRADEOFFS | VIABLE-WITH-TRADEOFFS | VIABLE-WITH-TRADEOFFS | VIABLE-WITH-TRADEOFFS | VIABLE-WITH-TRADEOFFS | Q1 is bounded and not a general ergonomics score |
| Existing pg brownfield / VSA / layered | INSUFFICIENT-EVIDENCE | INSUFFICIENT-EVIDENCE | INSUFFICIENT-EVIDENCE | INSUFFICIENT-EVIDENCE | INSUFFICIENT-EVIDENCE | INSUFFICIENT-EVIDENCE | AF r1/r2 records are complete but heterogeneous and non-aggregate; no architecture recommendation |
| Transaction-heavy or concurrency-heavy | VIABLE-WITH-TRADEOFFS | VIABLE-WITH-TRADEOFFS | VIABLE-WITH-TRADEOFFS | VIABLE-WITH-TRADEOFFS | VIABLE-WITH-TRADEOFFS | VIABLE-WITH-TRADEOFFS | T1/T2 observations only; no extrapolation beyond frozen tasks |
| Open-ended report builder | INSUFFICIENT-EVIDENCE | INSUFFICIENT-EVIDENCE | INSUFFICIENT-EVIDENCE | INSUFFICIENT-EVIDENCE | INSUFFICIENT-EVIDENCE | INSUFFICIENT-EVIDENCE | X1 H-007 r2 has one corrected terminal record per arm; it remains separate and non-aggregate |
| Schema/migration-centric team | PREFER-ALTERNATIVE | INSUFFICIENT-EVIDENCE | INSUFFICIENT-EVIDENCE | INSUFFICIENT-EVIDENCE | INSUFFICIENT-EVIDENCE | PREFER-ALTERNATIVE | Ashiba/pg do not own migration lifecycle; no ecosystem ranking claimed |
| Multi-DB portability | INSUFFICIENT-EVIDENCE | INSUFFICIENT-EVIDENCE | INSUFFICIENT-EVIDENCE | INSUFFICIENT-EVIDENCE | INSUFFICIENT-EVIDENCE | INSUFFICIENT-EVIDENCE | PostgreSQL-only measured runtime |
| AI-light or human-centric team | INSUFFICIENT-EVIDENCE | INSUFFICIENT-EVIDENCE | INSUFFICIENT-EVIDENCE | INSUFFICIENT-EVIDENCE | INSUFFICIENT-EVIDENCE | INSUFFICIENT-EVIDENCE | Fresh-Agent protocol does not measure human-only adoption |

`VIABLE-WITH-TRADEOFFS` is not `ACTIVELY-RECOMMEND`. It says only that at
least one frozen primary observation passed while other final failures and
unmeasured dimensions remain visible.
