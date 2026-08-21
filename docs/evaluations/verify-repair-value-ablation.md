---
title: Verify repair-value ablation
---

# Verify repair-value ablation

## Decision record

This phase measures the repair value of the **existing** Ashiba Verify surface,
not a new verifier. It starts at `d7741fe` on
`codex/verify-repair-value-ablation`. Product source is unchanged. Disposable
fixtures and raw evidence are ignored under `tmp/verify-repair-value-ablation`.

The question is not merely whether E2E can eventually find a defect. It is
what Rules plus ordinary tests cannot mechanically prove, what Ashiba Verify
adds, and whether requiring that proof changes a fresh agent's repair result.
Here, *unique* means unique only among four compared lanes: TypeScript/static,
ordinary application test, independent live PostgreSQL/E2E, and Ashiba Verify.
It does not exclude another purpose-built tool providing the same proof.

Repository evidence is this decision record and the existing command source.
The fixture hashes, nonces, PostgreSQL rows, worker reports, and orchestration
ledger are supplementary local evidence; their limits are stated below rather
than promoted to CI-visible proof.

## Method

The clean fixture has an isolated `app` schema, a `users` table with BIGINT and
a nullable field, named optional `email`, canonical finite ordering, and the
generated query model. The prior deterministic matrix ran every mutation
through all four lanes in separate isolated schemas. It selected two mechanical
cases for a matched repair ablation:

- **D1:** an otherwise harmless leading SQL comment makes source hash,
  safe-sort, optional-condition, and binding metadata stale.
- **D2:** editable TypeScript names `email_address` and `account_id` while SQL
  and generated contract name `email` and `user_id`.

There are three fresh Luna-high workers for each D1/D2 condition. The prompt,
fixture, database contract, writable area, and independent final evaluator are
identical. The only treatment difference is:

| Condition | Proof rule |
| --- | --- |
| A — Rules + ordinary tests | Source/static inspection, ordinary test, optional application E2E, and diff allowed; Verify/contract, generator, scaffold, and refresh forbidden. |
| B — Rules + ordinary tests + Verify required | Same rules, except existing `check-contract` must be green before completion. |

The runner preserved clean baseline, mutation, fixture, and public-contract
hashes plus a nonce per final D1/D2 run. An early D1/A reset lost manifests;
those three attempts were excluded and rerun with fresh manifests/nonces. The
independent evaluator, rather than worker report, invokes `check-contract`,
creates/drops `repair_eval_*` PostgreSQL schemas, executes the final named SQL,
asserts the expected bigint row, and checks canonical/public preservation.

## Observed

### Deterministic responsibility matrix

| Mutation | First detector | Classification | Boundary conclusion |
| --- | --- | --- | --- |
| stale source/generated hash | Ashiba Verify/contract | unique detection | Freshness is deterministic provenance, not behavior. |
| PostgreSQL schema/type drift | independent live PostgreSQL/E2E | duplicate detection | Ashiba DB-derived contract also reports it. |
| BIGINT/nullable/enum driver mismatch | ordinary application test | duplicate detection | Ashiba reports the declared boundary, but runtime assertion found it first. |
| named parameter/result mismatch | Ashiba Verify/contract | unique detection | The ordinary behavior test stayed green. |
| SQL semantic defect | ordinary application test | expected non-detection | Verify is not a business-meaning oracle. |
| transaction defect | ordinary application test | expected non-detection | Rollback/isolation/final state is a live application responsibility. |
| unsafe finite-sort bypass via raw interpolation | independent live PostgreSQL/E2E | expected non-detection | The route bypassed the adapter-bound safe-sort surface. |

No clean-control false positive was observed. A unit-only/no-op test command
remains a **false-ready** risk: `check --full` establishes only that its
selected command exited successfully, not that an undeclared live lane ran.

### Independent final D1/D2 results

All twelve final copies passed strict independent adjudication. Every final
live execution returned only `a@example.test`; node-postgres represented
`9007199254740993` as a string; public contract was unchanged; and the final
existing contract check was green.

| Defect | Condition | Strict final pass | escaped | canonical/public unnecessary edit | Verify calls reported |
| --- | --- | ---: | ---: | ---: | ---: |
| D1 freshness | A | 3/3 | 0 | 0/3 | 0 |
| D1 freshness | B | 3/3 | 0 | 0/3 | 4 |
| D2 named boundary | A | 3/3 | 0 | 0/3 | 0 |
| D2 named boundary | B | 3/3 | 0 | 0/3 | 4 |

| Cell | detector_first / first_failure_command | Repair files, diff intent, reruns_before_green | false_repair | strict_evaluator_after_repair / runtime_failure_avoided |
| --- | --- | --- | --- | --- |
| D1 A, 3 runs | direct source/generated static/hash comparison; ordinary test green | `search.sql`: remove the one injected comment; 1 each | none | 3/3 pass; not attributable because the mutation preserved runtime behavior |
| D1 B/1, B/3 | Verify first: stale source/query-model/binding; ordinary test green | `search.sql`: remove comment; 1 each | B/3 tried generated-only synchronization, detected its incompleteness, then reverted it | 2/2 pass; not attributable |
| D1 B/2 | Verify first: stale derived contract | `generated/query.sql.ts`, `generated/query.meta.ts`: synchronize two derived files to visible source; 1 | none final | pass; alternative valid freshness repair, not a behavior fix |
| D2 A, 3 runs | source/static inspection; ordinary test green | `query.ts`: restore `email` and `user_id`; 1 each | none | 3/3 pass; no A/B runtime escape occurred |
| D2 B, 3 runs | Verify first: missing/unused named boundary names; ordinary test green | `query.ts`: restore the same two identifiers; 1 each | none | 3/3 pass; no A/B runtime escape occurred |

Thus final false repairs are 0/12. There was one **intermediate** D1/B/3 false
repair attempt, reverted before final adjudication. No repository-wide diff
line count is claimed: the net D1 source repair removes one mutation line,
D2 restores two identifiers, and D1/B/2 changes two derived files.

### Semantic negative control

N1 reversed canonical `ORDER BY email` and refreshed metadata before
measurement. Before repair, existing Verify was green while the isolated live
PostgreSQL evaluator was red: the first row was `b@example.test`, not
`a@example.test`. This directly proves a fresh contract is not a business
semantic oracle.

The optional N1 fresh-agent pair is excluded from A/B inference. Its first
formatted-SQL anchor did not inject the mutation; that runner defect was fixed
before the recorded pre-repair result. On rerun, A violated its no-Verify rule
and B did not leave the required worker report after interruption. These are
recorded `missing_evidence` protocol failures, not silent successes.

### Orchestration

The explicitly requested orchestration routed bounded fixture repair to Luna
high. The durable resumed ledger records three successful replacement D1/A
workers and two N1 `missing_evidence` failures. Runtime token, credit, and
reliable worker wall-time telemetry were unavailable; no estimates are made.
Ledger zero-duration event timestamps are not claimed worker durations. No
Terra/Sol escalation was justified: the N1 problem was protocol evidence, not
model capability.

## Inference

1. A trustworthy verification boundary need not be Ashiba-owned for behavior:
   application-owned E2E is authoritative for SQL semantics, transactions,
   final state, and raw adapter bypass. N1 is the direct counterexample to
   treating Verify as sufficient.
2. Ashiba's distinctive proof is source freshness and structured source/DB
   agreement. D1 freshness and D2 named parameter/result drift were unique
   among the four lanes. PostgreSQL schema/type/driver proof is valuable early
   evidence, but an independent live catalog evaluator can duplicate it.
3. This matched sample did **not** measure a repair-outcome improvement. A and
   B both achieved 3/3 strict final passes for D1/D2, with no escaped defect,
   final false repair, or canonical/public churn. Verify made B's first
   mechanical signal explicit; A found the same root causes by inspection.
   Therefore no reduction in false repair, rework, or runtime failure is
   established.

## Responsibility classification

| Existing Verify responsibility | Classification | Evidence / limit |
| --- | --- | --- |
| source/generated hash freshness | **Unique Core Proof** | D1 unique among the compared lanes; provenance, not semantics. |
| named parameter/result contract | **Unique Core Proof** | D2 unique among the compared lanes. |
| PostgreSQL-derived schema/type/driver contract | **Useful Early Proof** | It reports before normal runtime, but live catalog evaluation can duplicate it. |
| BIGINT/nullable/enum representation | **Duplicate of Application Test** | Runtime assertion detected first in this fixture. |
| `check --full` selected-command completion | **Insufficient Evidence** | It can be false-ready without declared required lanes. |
| adapter-bound finite safe-sort | **Insufficient Evidence** | This phase measured only an adapter bypass. |
| SQL business semantics | **Remove Candidate** | Not a Verify ownership claim. |
| transactions/final state/isolation | **Remove Candidate** | Live application tests own this proof. |
| arbitrary raw interpolation bypass | **Remove Candidate** | Outside adapter inspection. |

## Limits and attainment

| Item | Status | Evidence |
| --- | --- | --- |
| deterministic seven-mutation matrix | done | Four independent lanes and first-detector classifications above. |
| matched D1/D2 fresh-agent A/B | done | 12 independent final evaluations, three per cell. |
| isolated PostgreSQL final evaluator | done | One dropped schema per run; bigint and expected-row assertions passed. |
| semantic negative control | done | Verify green, live E2E red before repair. |
| measured repair-value gain | done, negative result | No D1/D2 final outcome difference observed. |
| product source changes | done | None. |
| N1 fresh-agent comparative outcome | not done by design | Excluded after documented protocol failures. |

**Outcome:** done with bounded evidence. Ashiba should own mechanical
source/contract proof; application-owned E2E should own behavior and state.
Ashiba-unique proofs were observed, but this sample did not show that requiring
them reduces agent false repair, rework, or runtime failures.
