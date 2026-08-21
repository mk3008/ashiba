---
title: Dynamic Mechanism Value Ablation
---

# Dynamic Mechanism Value Ablation

This record tests whether two existing dynamic-SQL mechanisms should expand
the provisional Minimum Ashiba v0:

> Rules + small Mechanical Contract Proof

It is an evidence record, not a product proposal. No product source was
changed. The experiment began from `main` at
`39d0a565210091a9415e6f7f4c67e839c1124467` and used branch
`codex/dynamic-mechanism-value-ablation`.

## Decision

Minimum Ashiba v1 is **retained, not expanded**.

| Mechanism | Classification | Minimum-v1 decision |
| --- | --- | --- |
| Existing Safe Sort runtime | Rule Only | Keep the closed-world finite-key/direction rule; do not require the present generated-runtime packaging in Minimum v1. |
| SSSQL coordinate-metadata subtraction | Useful Early Proof | Keep as an optional, explicitly scoped accelerator; do not make it Minimum-v1 core. |

The useful parts are real but narrower than a core requirement:

- Safe Sort uniquely detects source/query-model drift on an adapter-bound
  path, but ordinary finite-map rules rejected all hostile runtime inputs in
  the comparison. The current metadata model also couples direction support
  to source-visible variants.
- SSSQL uniquely detects stale generated coordinate/binding metadata before a
  PostgreSQL call. It did so in two of four fresh O-C repair trials. It does
  not prove that optional-filter business meaning is correct, and its measured
  artifact cost grows sharply at 100 queries.

Neither mechanism independently demonstrated fewer production runtime
failures. The independent live evaluator demonstrated executable SQL behavior;
the agent trials demonstrated early contract failures and some repair
navigation value. Those are different claims.

## Scope and controlled conditions

The deterministic harnesses ran before any fresh-agent work. PostgreSQL probes
used a disposable schema per run in `ztd-perf-sandbox` on host port `55432`.
The baseline `pnpm verify` initially failed because the new worktree had no
`node_modules`; after `corepack pnpm install --frozen-lockfile`, it passed all
repository verification lanes.

Fresh agents used the same worker role/model selection supplied by the
orchestration skill and separate directories. Their prompts prohibited reading
other agents' directories, result files, or evaluator files. The platform does
not expose an enforceable per-worker wall-clock budget or a filesystem privacy
boundary, so this is a controlled prompt/directory isolation, not a claim of
cryptographic isolation. Exact platform token and duration telemetry was not
available; the orchestration ledger records that absence rather than inventing
values.

The primary comparison was construction followed by the same repair mutation:

- Safe Sort: public keys changed from `created_at`, `priority`, `user_id` to
  `updated_at`, `rank`, `user_id` while both directions stayed valid.
- SSSQL: public `state` became `workState`; canonical `:state`/`work_state`
  became `:work_state`/`work_state_code`; an optional `region` was added.

The fresh trials did not receive previous measurements or a prompt encouraging
natural use of Verify.

## Safe Sort

### Deterministic mechanism and live behavior

The fixture generated metadata through the existing CLI, then called the
existing `renderSafeOrderBy` and PostgreSQL adapter. It exercised nine runtime
cases: four valid single-key directions, a multi-key tie breaker, unknown key,
invalid direction, hostile key, and hostile direction.

| Observation | Rules-only finite map | Existing Safe Sort | Classification |
| --- | --- | --- | --- |
| Known key/direction | Accepted | Accepted | duplicate detection |
| Unknown/invalid/hostile runtime input | Rejected | Rejected | duplicate detection |
| New finite key absent from reviewed profile | No freshness proof | `ASHIBA_UNKNOWN_SORT_KEY` | unique detection |
| Source/query-model mismatch | No freshness proof | `ASHIBA_SORT_QUERY_MODEL_STALE` | unique detection |
| Raw-string interpolation bypass | Can be unsafe | Adapter is not invoked | expected non-detection |

The independent PostgreSQL evaluator executed ascending and descending
`created_at` and `priority` orderings plus a newly added finite `status` key in
an isolated schema; all five executable checks passed. It intentionally did
not execute an injected multi-statement string. That bypass is application
owned and outside adapter observation.

An important coupling result was also measured: one source-visible SQL query
containing both `created_at asc` and `created_at desc` generated a sortable
profile that allowed only `asc`. To permit both directions the fixture used
separate variants; one fresh implementation used eight source-visible variants
for its finite direction combinations. This is review/artifact coupling, not
an application behavior benefit.

### Fresh-agent repair result

| Arm | Runs | Parent strict evaluator | First detector reported by repair | False repair |
| --- | ---: | ---: | --- | --- |
| S-A: Rules + ordinary tests | 3 | 3/3 pass | ordinary test in 3/3 | 0 |
| S-B: Rules + Safe Sort required | 3 | 2/3 parent Node pass; 1 `tsx`-only import limitation, agent test pass | ordinary test in 2/3; Safe Sort runtime in 1/3 | 0 |

Every S-A repair reached green after one rerun. S-B likewise reached its
agent-owned green check after one rerun. The trial in which Safe Sort was first
was useful for locating the stale profile, but there was no observed reduction
in diff size, reruns, or false repairs over the three rules-only repairs.

The first parent evaluator itself produced false positives: it compared SQL
case/quoting too literally, did not await an async rejection, and could not
load one trial's generated TypeScript from plain Node. Comparator normalization
and `await` were fixed, then the matrix was rerun. The pre-fix terminal output
was observed during the run but was not retained as a separate artifact; the
final evaluator JSON is retained. This is an experiment-harness limitation,
not an Ashiba product defect. The remaining `tsx` loader limitation is reported
as a strict-evaluator non-result, not as a failure of S-B/3.

### Safe Sort conclusion

The mandatory invariant is a closed-world, reviewed mapping from public input
to complete ordering terms. Application-owned rules and ordinary tests can
provide it. The existing adapter runtime adds source freshness and metadata
coupling proof only when every execution remains on that adapter-bound path.
It is therefore **Rule Only** for Minimum v1, with the runtime available as an
optional accelerator where its coupling cost is accepted.

## SSSQL optional-condition subtraction

Three deliberate implementations were compared at 1, 10, and 100 queries:

- **O-A:** application-owned retained nullable guards.
- **O-B:** application-owned finite source-visible marker removal.
- **O-C:** existing Ashiba generated coordinate metadata and optional-condition
  compression.

### Deterministic scale and stale results

All nine deterministic fixtures had zero second-run changed files. The
isolated PostgreSQL evaluator ran O-A/O-B/O-C and returned the same two rows
for each path.

| Queries | Variant | Files | Artifact bytes | Source bytes | Metadata bytes | Second-run churn |
| ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | O-A | 5 | 740 | 596 | 0 | 0 |
| 1 | O-B | 5 | 981 | 820 | 0 | 0 |
| 1 | O-C | 20 | 18,473 | 661 | 5,120 | 0 |
| 10 | O-A | 32 | 5,807 | 4,808 | 0 | 0 |
| 10 | O-B | 32 | 8,064 | 7,048 | 0 | 0 |
| 10 | O-C | 182 | 181,715 | 5,458 | 51,200 | 0 |
| 100 | O-A | 302 | 56,477 | 46,928 | 0 | 0 |
| 100 | O-B | 302 | 78,894 | 69,328 | 0 | 0 |
| 100 | O-C | 1,802 | 1,814,135 | 53,428 | 512,000 | 0 |

The fixture is deliberately small and is not a production-scaffold benchmark.
It nevertheless makes the coupling difference concrete: O-C had 32.1x the
O-A artifact bytes at 100 queries and 6x the files. The generated artifacts
were stable on a second run; stability does not erase their review/refresh
surface.

Fifteen stale mutations were exercised. O-C rejected all five of its mutated
source/coordinate cases with `ASHIBA_QUERY_MODEL_STALE`; O-A/O-B made no stale
metadata claim. This is **unique detection**, but only of generated-artifact
freshness, not of whether the optional predicate is the intended business
predicate.

One early harness mutation intended to reorder optional conditions did not
actually change source text. It was corrected before the recorded rerun. This
is logged as an experiment defect and is not counted as stale evidence.

### Fresh-agent repair result

There were two fresh trials for each arm at scale 1 and 100 (12 total).

| Arm | Scale | Strict green after repair | First detector pattern | False repair / false positive |
| --- | ---: | --- | --- | --- |
| O-A retained guards | 1, 100 | 4/4 ordinary test green | ordinary test 4/4 | 1/4 initial repair silently accepted legacy `state`; ordinary test caught it |
| O-B marker subtraction | 1, 100 | 4/4 ordinary test green | ordinary test 4/4 | 0; one 1-query trial needed 2 reruns for marker/bind bookkeeping |
| O-C coordinate metadata | 1, 100 | 4/4 agent strict green | Ashiba contract first 2/4; ordinary test first 2/4 | 1 evaluator false positive at 100: null branches were incorrectly required to remain textually present after compression |

The O-C Ashiba-first examples were `ASHIBA_QUERY_MODEL_STALE` after SQL was
edited before refresh and `ASHIBA_MISSING_PARAMETER: state` during a
catalogue-wide migration. Those failures occurred before a client query call.
After regeneration, all affected generated boundaries compiled. This is a
useful early mechanical proof.

However, the independent live PostgreSQL evaluator was run for the
deterministic O-A/O-B/O-C paths, not for every agent-created repair artifact.
Consequently this record does **not** claim that O-C caused fewer live runtime
failures. It shows early stale-contract prevention and repair navigation, not
a completed causal runtime-outcome study.

### SSSQL conclusion

O-C is **Useful Early Proof**, not core proof. It can make a stale coordinate
or binding model mechanically visible before PostgreSQL execution, and it did
so in fresh repairs. But ordinary application-owned tests found all O-A/O-B
migrations and half of O-C migrations; they also caught the only agent false
repair. Coordinate subtraction has no evidence here for business semantics,
transactions, arbitrary raw SQL, or adapter bypasses. Its substantial artifact
surface prevents Minimum-v1 promotion.

## Verification boundary answer

The trustworthy boundary need not be Ashiba-specific for behavioral meaning,
final state, transactions, or adapter-bypass safety: application-owned E2E is
the authoritative boundary there. Ashiba-specific proof is justified only for
mechanically derived facts unavailable to those tests without recreating the
same mechanism: source/generated freshness, compiled binding/coordinate
consistency, and adapter-bound safe-sort profile consistency.

Those proofs reduced *time to a mechanically actionable failure* in selected
O-C and S-B trials. They did not, in this sample, reduce aggregate false
repairs, reruns, repair breadth, or independently measured PostgreSQL runtime
failures. The correct present decision is optional use with clear boundary
labels, not expansion of the required minimum.

## Reproduction pointers

Ignored, deterministic artifacts and raw observations are under
`tmp/dynamic-mechanism-value-ablation/`:

- `safe-sort/build-fixtures.mjs`, `run-matrix.mjs`, `probe-both-directions.mjs`,
  `live-evaluator.mjs`, and `evaluate-fresh-trials.mjs`; the final parent
  evaluator result is `safe-sort/results/fresh-agent-evaluation.json`.
- `ssql/harness.mjs` (including its isolated PostgreSQL probe),
  `ssql/self-test.mjs`, and `ssql/results/result.json`.
- `fresh-agents/*/trial.md` and `fresh-agents/*/repair.md`.
- `tmp/orchestration-metrics/dynamic-mechanism-value-ablation/metrics.jsonl`.

The repository has no current constitution file at the expected prior-phase
path, so no constitution update was made. The decision above is recorded in
this evaluation rather than fabricating a replacement constitutional surface.
