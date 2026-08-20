# AI-Native Competitive Value Benchmark

## Decision record

This pilot asks whether adopting Ashiba adds observable value for an AI-led
PostgreSQL application, compared with plain `pg` + SQL, sqlc, Drizzle, and
Kysely. It is not a feature-list comparison and it does not establish an
overall winner.

**Outcome: partial.** The pilot produced a useful strict acceptance gate and
exposed evidence-quality failures. It did not execute the required controlled
Fresh-Agent comparison, so it cannot support a general claim about agent
effectiveness or natural CLI adoption.

The isolated worktree began from `origin/main`
`30d9fdec773e93929142b5c40bdf41ba6772f039` (PR #53 merge) with no changes
in that worktree. The user's primary worktree was already dirty and was not
touched. Product source changes were not made.

## Observed

### Tool/version and fairness protocol

| Arm | Version actually used | Strict-gate status |
| --- | --- | --- |
| Plain Raw SQL | Node `v22.14.0`, `pg` `8.16.3` | accepted |
| Ashiba | workspace CLI through `npx tsx`; pnpm `10.19.0` | self-report only; not accepted |
| sqlc | not available; Go also unavailable | not run |
| Drizzle | `drizzle-orm` `0.45.2`, `pg` `8.16.3` | not accepted |
| Kysely | `kysely` `0.29.5`, `pg` `8.16.3` | not accepted |

The controlled runner fixed the starting fixture, requirements, environment
contract, prepared files, command capture, end-state evidence, and independent
evaluator input. It rejects an arm JSON or process exit as sufficient proof.
The PostgreSQL fixture `v2-w3-no-order-w4-deep-page` had four customers, one
customer with no orders, 6,000 deterministic orders, two queue items, and a
deep-page assertion of 50 rows at offset 4,000. The normalized DDL+seed hash
was `e0474d61835e5554ddf3a83525209c3de05b9e7bc76765f245e1c2770ad652f3`.

Schema identifiers are embedded in private-fixture SQL, so exact per-arm file
hashes differ. The gate therefore separately checked normalized content and
required every arm to report the exact prepared-fixture hash it used.

| Arm | Evidence finding |
| --- | --- |
| Raw SQL | Claimed and prepared hashes match; independent evaluator exited 0. |
| Ashiba | Exact fixture binds, but `independent-results.json` explicitly says no independent verifier ran. |
| Drizzle | Normalized SQL matches, but claimed fixture hash differs from its exact prepared hash. |
| Kysely | Normalized SQL matches, but claimed fixture hash differs from its exact prepared hash. |
| sqlc | No runnable environment. |

### Ordinary business workloads

The workload has finite optional search and sort, pagination, CTE/window or
aggregate behavior, JSON/array behavior, bigint/numeric/nullable/enum
boundaries, a semantic repair, `EXPLAIN` tuning, and a `FOR UPDATE SKIP LOCKED`
two-write transaction.

| Arm | W1 feature | W2 drift | W3 semantics | W4 tuning | W5 transaction | Independent conclusion |
| --- | --- | --- | --- | --- | --- | --- |
| Raw SQL | pass | pass | pass | pass | pass | All workloads and unknown-sort rejection passed live independent verification. |
| Ashiba | self-test pass | self-test pass | self-test pass | self-test pass | self-test pass | partial: independent final verifier was not run. |
| Drizzle | arm reports pass | arm reports pass | arm reports pass | arm reports pass | arm reports pass | not accepted: fixture evidence is unbound; W1 also has a semantic mismatch. |
| Kysely | arm reports pass | arm reports pass | arm reports pass | arm reports pass | arm reports pass | not accepted: fixture evidence is unbound. |
| sqlc | not run | not run | not run | not run | not run | no environment. |

The evaluator derived W1's expected pre-limit window count independently:
the `paid` + `pro` + `vip` predicate selects 1,000 of 6,000 orders. Ashiba and
Kysely reported 1,000. Drizzle reported 20, the page length. This is a
concrete semantic or measurement mismatch, not a pass because an arm-level
boolean claimed success. Raw SQL independently proved the page but did not
record a window-count value, so that subcomparison remains incomplete.

Raw SQL's accepted evidence included numeric precision `12 -> 18`, nullable
`completed_at`, a preserved string-or-null public representation, retention
of the customer with no orders, a sort-to-index plan improvement retaining 50
deep-page rows, rollback after an injected second-write failure, exactly-one
commit, and rejection of unknown sort before SQL construction.

Ashiba's self-test recorded the intended ordinary behavior and four finite
keyset variants. The implementation discovered and used `model-gen` once; it
did not use feature/query scaffolds, PostgreSQL-contract generation, project
check, or SQL-resource snapshot. This is only an arm-implementation
observation. It is not a natural-adoption rate because no controlled Fresh
Agent executed the same treatment.

Drizzle and Kysely typechecked and produced live arm evidence, including four
finite keyset variants and explicit transaction APIs. The Drizzle arm repaired
a missing SQL alias and table-schema interpolation. The Kysely arm repaired a
transaction-schema omission. Those are pilot observations, not normalized
retry-rate results.

### Builder control and dynamic keyset

The open-ended analytics/query-designer control was outside the ordinary
score. No arm implemented the same full requirement for arbitrary user
projection, nested filter trees, aggregate/grouping, and relation selection.
This pilot therefore has **no comparative builder-control result**.

For bounded dynamic keyset, Raw SQL exercised six finite, bound-value variants
(`created_at`, `total_cents`, nullable `completed_at`, both directions).
Ashiba, Drizzle, and Kysely recorded four finite bound-value variants. This
shows that a small closed world can work. It does not show that the approach
scales to a broad user-defined query language, nor that a builder loses there.

### Review, SQL assets, and exit surface

| Arm | Primary review surface | Investigation/tuning | What remains if removed |
| --- | --- | --- | --- |
| Raw SQL | SQL, bindings, transaction boundary | SQL is directly executable and explainable | SQL and application contracts |
| Ashiba | SQL and transaction boundary; metadata/binding proof is secondary | SQL is directly executable and explainable | SQL, contracts, generated TypeScript/metadata |
| Drizzle | builder, schema declarations, SQL templates/generated SQL | generated SQL and plan inspection | contracts and builder/schema expressions |
| Kysely | builder, `Database` interface, SQL fragments | generated SQL and plan inspection | contracts and builder expressions |
| sqlc | not observed | not observed | not observed |

This is a qualitative surface inventory, not a timed review ranking. Builders
may expose SQL adequately for tuning; the pilot did not measure that effort.

### Controlled Fresh-Agent status

**Not done.** A Fresh Agent did not execute the same prompt, permissions,
timebox, and independent evaluator in all five arms. The arm implementation
lanes were arm-aware, so their work cannot be substituted for that treatment.
Consequently no comparative claim is made about files read, bytes read,
commands, wall time, retries, human intervention, or AI preference.

## Inference

1. The evaluator-owned gate added practical benchmark value: it prevented
   self-report-only Ashiba evidence, stale Drizzle/Kysely fixture binding, and
   a Drizzle W1 mismatch from becoming a false winner.
2. Plain Raw SQL plus a driver is demonstrated viable for this ordinary
   workload with finite runtime syntax and live PostgreSQL verification.
   **Ashiba added no measured incremental correctness value over Raw SQL in
   this pilot**, because the Ashiba arm did not pass the same independent gate.
3. Ashiba's visible SQL and generated metadata may reduce review or freshness
   burden, but this pilot did not observe a comparative defect prevention or
   an independent proof of that benefit.
4. Drizzle/Kysely remain plausible for a broader dynamic query space, but the
   incomplete builder control does not demonstrate that advantage here. Their
   arm results also show static builders alone do not prevent driver
   numeric/nullability assumptions or semantic result mistakes.

## Hypotheses not proved

- Ashiba verification is more valuable to AI-led work than its generators.
- A Fresh Agent naturally selects `model-gen` or verifier tools and gains
  correctness or avoids repeated work.
- Closed-world keysets become less maintainable than builder composition past
  a bounded variant count.
- sqlc has a distinct SQL-first typed advantage here.
- Reviewers understand canonical SQL faster than builder composition.

## Adoption envelope

| Situation | Evidence-bound recommendation |
| --- | --- |
| SQL-centric PostgreSQL work with a small closed dynamic surface and disciplined live checks | Plain Raw SQL is demonstrated viable. Ashiba is a candidate, not yet a proven incremental winner. |
| SQL-first typed generation is required | sqlc is an unmeasured candidate; provision it before deciding. |
| The product genuinely needs broad user-shaped query composition | Evaluate Drizzle/Kysely or a dedicated query language in a separate controlled task. |
| Existing Raw SQL needs verifiable SQL/resource contracts | Re-run Ashiba with a genuine independent evaluator before adopting on this claim. |

Ashiba has no observed workload win. It loses on this record only because it
has no accepted result while Raw SQL does. There is no meaningful difference
proved for bounded finite keyset. sqlc and the broad builder boundary are
insufficient evidence.

## Product scope and recommended next experiment

No Ashiba product feature, query builder, safe-pagination feature, scaffold
architecture, VSA rule, repository abstraction, MCP, or migration framework
changed. The first fixture was rejected because it could not test the no-order
and deep-page requirements; fixture v2 repaired the harness before the final
gate.

Next, repair evidence binding before expanding scope: emit exact prepared
fixture hashes (or a defined schema-name-normalized hash), make the evaluator
own W1's window-count assertion, and run one ordinary workload with a genuine
Fresh Agent under identical prompt, permissions, timebox, and end-state
capture. Only then add sqlc and a full builder-favoring analytics task.

## Four required answers

1. **Was a benefit from adding Ashiba to plain Raw SQL observed?** No. Raw SQL
   is the only strict accepted arm; Ashiba's self-test alone cannot establish
   incremental value.
2. **When is choosing Ashiba over sqlc / Drizzle / Kysely rational?** The
   plausible condition is SQL-centric PostgreSQL work valuing application-owned
   executable SQL, finite runtime syntax, and verifiable resource contracts.
   Here that remains a hypothesis until the independent Ashiba rerun succeeds.
3. **When should Ashiba not be chosen?** Do not choose it from this pilot when
   independently demonstrated incremental value is required, when a broad
   user-defined query language is needed, or when a separately-proved typed
   generator/builder advantage is decisive.
4. **Was Ashiba worth existing for from the AI work observed?** The verifier
   idea remains worth testing because strict evidence gates exposed errors arm
   self-reports concealed. Product value is not yet proved: the Ashiba arm did
   not supply the independent evidence needed to make that case.

## Verification basis and limits

This decision record is repository evidence. Disposable local runner/arm
artifacts, the runner protocol, and live PostgreSQL results are supplementary
evidence. The record guarantees neither product behavior nor a competitive
winner; it records what the strict gate accepted, rejected, and left
unmeasured.
