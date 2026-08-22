# AI-Native PostgreSQL Competitive Benchmark v2 Follow-up

## Question

This follow-up asks a narrower question than the original v2 record: after
separating the original combined state-change workload, can comparable Fresh
Agents deliver runner-owned, live-PostgreSQL-correct implementations for an
atomic transfer (T1), a concurrent work-item claim (T2), and a bounded
brownfield tuning task (W5)? It also retrospectively classifies the original
v2 non-passes from preserved runner-owned evidence. It does **not** revise the
historical v2 matrix or rank the tools.

## Scope

Five candidate treatments were compared: Minimum Ashiba v1 (A), Prisma 8 RC
(P), sqlc TypeScript/Node (S), Drizzle (D), and Kysely (K). The comparative
run matrix is `5 arms x (T1 + T2) x 2 Fresh-Agent replicates = 20` transaction
or concurrency cells, plus `5 arms x 2 replicates = 10` W5 cells: **30 scored
cells**. B1 is deliberately absent; it is outside ordinary PostgreSQL
application work and needs a separate builder benchmark.

This is evidence about the pinned treatments, task contracts, one agent
profile, and one PostgreSQL fixture. It is not a capability survey, a tool
productivity score, a general transaction/concurrency result, or a measure of
review cost, generated-code burden, coupling, or natural user preference.

## Environment

- Base: `origin/main` at `1cd226eee0e2b1199b11c975ac2d1c2b05eb3ea3`.
- Runtime: portable Node `v24.19.0`; Docker PostgreSQL 18.1
  (`server_version_num` `180001`) on host port 5432.
- Isolation: a new safe nonce schema per reference or compatible comparative
  evaluation. No candidate may read benchmark data from `public`.
- Fixture identity: the runner owns the T1 `accounts` and `transfer_audit`,
  T2 `work_items`, and W5 `pagination_items` fixtures described in the
  committed [workload specification](./fixtures/competitive-benchmark-v2-followup/workload-spec.md).
- Intended packages: Ashiba at the base commit; Prisma CLI `8.0.0-rc.7` and
  `@prisma/orm-postgres` `8.0.0-rc.4`; sqlc `1.31.1` plus
  sqlc-gen-typescript `0.1.3`; Drizzle `0.45.2`; Kysely `0.29.5`; and `pg`
  `8.23.0` where its workflow uses node-postgres. Per-run raw records retain
  the resolved runtime evidence; an intended package version is not evidence
  that a submitted boundary actually used that workflow.

## Treatments

Every comparative cell used `luna_worker` / `gpt-5.6-luna` / high effort, the
same permissions, a 45-minute timebox, Node 24, PostgreSQL 18 fixture, neutral
workload body, and runner evaluator. Agents did not receive evaluator
assertions or another cell's outcome. The only arm-specific direction was:
“Use the installed tool according to its intended workflow.”

| Arm | Declared treatment |
| --- | --- |
| A | Minimum Ashiba v1 canonical-SQL workflow; no added product capability. |
| P | Prisma 8 RC installed contract/data-layer workflow. |
| S | sqlc TypeScript/Node query-generation workflow. |
| D | Drizzle's normal ORM/query workflow. |
| K | Kysely's normal typed-query workflow. |

A runner-owned adapter could invoke a documented CLI or function boundary, but
could not change a candidate, add a transaction, or synthesize SQL/EXPLAIN
evidence. This distinction matters: a direct `psql` or node-postgres substitute
may satisfy a live behavioral assertion while remaining a strict treatment
failure for its declared arm.

## Workloads

| ID | Business situation and agent task | Important PostgreSQL behavior | Runner-owned pass oracle | Intended capability |
| --- | --- | --- | --- | --- |
| T1 — atomic account transfer | Move integer cents from one customer account to another and write an audit row. The agent implements a callable `transfer(from, to, amount)` against the supplied schema. | The exact `accounts(account_id, balance_cents)` and `transfer_audit` names must be used in the nonce schema. Debit, credit, and audit are one transaction; insufficient funds and an injected post-debit failure roll back. Values are bound runtime inputs. | Separate connections assert exact success state and audit row, no state change for insufficient funds or injected failure, nonce-safe access, and a compatible public boundary. | Implement an ordinary application transaction without partial state. |
| T2 — concurrent work-item claim | Two workers concurrently claim independent queued `work_items`; the agent exposes a callable claim boundary. | The supplied `work_items(id, state, claimed_by)` table is in the nonce schema. Two independent connections must not claim the same row; an injected post-update failure must roll back. `SKIP LOCKED` was permitted but not prescribed. | Two concurrent calls must return distinct claims; final committed rows must be correct; the rollback case leaves its row unclaimed. | Converge on PostgreSQL-safe concurrency and rollback through the submitted boundary. |
| W5 — brownfield investigation and tuning | An endpoint returns the correct page but is slow at production-like row counts. The agent investigates the executed query, obtains EXPLAIN evidence, improves it, and preserves behavior using the same arm-specific starter and frozen entrypoint. | The initial path is correct deep-offset pagination. The frozen runner independently captures `EXPLAIN (FORMAT JSON)`, checks result equivalence and regressions, and requires the frozen plan metric to improve. | The fixed public boundary returns equivalent ordered pages and regressions, preserves frozen runner/core files, changes the candidate, and reduces the measured plan work. | Diagnose and improve a bounded PostgreSQL read path without a prescribed SQL rewrite. |

Full schema, non-scope, and evaluator details are in the committed
[workload](./fixtures/competitive-benchmark-v2-followup/workload-spec.md) and
[evaluator](./fixtures/competitive-benchmark-v2-followup/evaluator-spec.md)
specifications.

## Evaluator / Oracle

The runner created DDL, seed values, nonce schema, inputs, independent
parameterized assertions, result records, and cleanup. It did not import a
candidate model, generated artifact, or candidate-authored test. Reference
controls were required to pass before Fresh-Agent evaluation; they passed T1,
T2, and W5 under the same Node/PostgreSQL wrapper.

The result notation is:

- **P** — runner-owned adapter invoked the submitted public boundary and the
  independent PostgreSQL oracle passed under the declared treatment.
- **F** — a boundary was invoked, but the independent oracle failed or the
  submitted boundary did not use the declared treatment.
- **U** — no compatible submitted boundary was evaluable without changing
  candidate files. It is a measured strict non-pass, not a tool-wide result.

`strict / live` below keeps treatment compliance separate from the live
PostgreSQL behavioral assertion. Candidate `RUN.md` / `RUN-REPORT.md` material
is observational only (first useful signal, false-repair attempt, reruns,
files/diff, generated churn, review surface, coupling, and fallback); it is
not the pass oracle.

## Run Matrix

The table shows every scored transaction/concurrency cell. Replicate labels are
not uniformly numbered because calibration, a missing-packet dispatch, and one
incomplete P-T1 directory were excluded before scoring; the named records are
the authoritative scored population.

| Arm | T1, replicate 1 | T1, replicate 2 | T2, replicate 1 | T2, replicate 2 |
| --- | --- | --- | --- | --- |
| A | `A-T1-r2` P / P | `A-T1-r3` F / P | `A-T2-r1` F / F | `A-T2-r2` F / P |
| P | `P-T1-r3` F / P | `P-T1-r4` F / P | `P-T2-r1` F / F | `P-T2-r2` F / F |
| S | `S-T1-r2` U / U | `S-T1-r3` F / P | `S-T2-r2` F / P | `S-T2-r3` F / F |
| D | `D-T1-r2` F / F | `D-T1-r3` F / F | `D-T2-r1` P / P | `D-T2-r2` F / P |
| K | `K-T1-r2` F / F | `K-T1-r3` F / F | `K-T2-r1` F / P | `K-T2-r2` F / F |

Strict totals for T1/T2 are **P 2, F 17, U 1**. Live PostgreSQL totals are
**P 10, F 9, U 1**. The sole `U` (`S-T1-r2`) did not create a fixture, so its
cleanup is correctly `not-run`; each of the other 19 transaction/concurrency
records reports successful cleanup.

W5 has ten scored cells using the fixed entrypoint:

| Arm | r1 | r2 |
| --- | --- | --- |
| A | P | P |
| P | P | P |
| S | P | P |
| D | P | P |
| K | P | F — BigInt JSON serialization failed in the frozen CLI adapter |

W5 strict totals are **P 9, F 1, U 0**. All ten W5 records report PostgreSQL
18 execution and successful nonce-schema cleanup. K-W5-r2's live PostgreSQL
oracle passed although its strict CLI serialization check failed. Across the
scored follow-up matrix, the strict result is **P 11, F 18, U 1**; the live
PostgreSQL result is **P 20, F 9, U 1**.

## Observed

1. The reference application passed every T1 oracle (success, insufficient
   funds, and injected post-debit rollback), T2 oracle (two distinct claims
   and rollback), and W5 oracle (equivalent results and plan work from 20,025
   to 25 rows visited). This validates the harness for its frozen fixtures; it
   is not a candidate result.
2. The two strict transaction/concurrency passes were `A-T1-r2` and
   `D-T2-r1`. The other strict results reflect live oracle failures, a missing
   callable boundary, or a boundary that used `psql`/node-postgres rather than
   the arm's declared workflow. The complete first-failure evidence is in the
   recovery records, rather than inferred from agent self-reports.
3. The W5 runner independently observed result equivalence, regression-page
   equivalence, unchanged frozen runner/core hashes, candidate changes, and a
   reduction from 20,025 to 25 rows visited for each of its nine P records.
   K-W5-r2 failed because its changed candidate reached JSON serialization of
   a BigInt through the frozen entrypoint, not because the runner rewrote it.
4. The original v2 non-pass classification is a preservation exercise, not a
   new experiment. Its 35 records classify primarily as candidate implementation
   defects (17), missing/incompatible public boundaries (5), protocol mismatch
   (5), runtime dependency/setup failures (6), or environment/isolation
   failure (2). It has no primary assignment to workflow misuse, evaluator
   defect, workload ambiguity, plausible product limitation, or insufficient
   evidence. In particular, original W4 all-arm failures did not establish
   intrinsic transaction/concurrency weakness: the preserved records were
   dominated by candidate boundary and schema/implementation defects while
   combining two questions.
5. Seven non-scoring directories are retained as calibration, missing-packet,
   or incomplete-dispatch evidence: the five under-specified T1 `r1` starts,
   `S-T2-r1` with no usable packet, and `P-T1-r2` without a usable final
   submission. None contributes to the 30-cell matrix or totals.

## Inference

- Passing reference controls makes the follow-up's frozen oracle usable for
  interpreting the recorded candidate artifacts. It does not show that any
  tool generally supports all transaction, concurrency, or tuning work.
- In this treatment, strict success depends on both database behavior and
  faithful use of the declared workflow. A live pass obtained via a substitute
  boundary cannot support a comparative arm pass.
- The nine W5 passes show that this deliberately bounded deep-pagination
  investigation converged under the frozen starter/entrypoint. They do not
  establish broad brownfield performance superiority or general EXPLAIN skill.
- The original v2 W4 result should not be used as a tool limitation claim;
  this follow-up supplies separate, controlled T1 and T2 evidence instead.

## Hypotheses

- A future, larger matrix may find that canonical SQL with a small mechanical
  proof has a compact review and investigation surface for bounded PostgreSQL
  work.
- Contract-first, generated-query, ORM, and typed-query workflows may differ
  in how reliably Fresh Agents expose a compatible public boundary.
- These remain hypotheses. This 30-cell result was not designed or normalized
  to compare productivity, maintenance cost, review cost, generated churn, or
  open-ended composition.

## Limits

- Two Fresh-Agent replicates per cell, one model/effort profile, one base
  commit, one host, and one PostgreSQL fixture do not support an overall tool
  ranking or population-level rate.
- W5 deliberately supplied a known deep-offset starting condition and a fixed
  boundary. It measures this bounded repair, not arbitrary production tuning.
- Agent-authored first-signal, rerun, churn, review-surface, coupling, and
  fallback descriptions are heterogeneous observational evidence; no
  preregistered score converts them into a cross-arm metric.
- The historical v2 classification is limited to retained records. It does not
  reconstruct missing original prompts or change historical outcomes.
- Raw candidates, verbose logs, and per-cell records remain disposable `tmp/`
  evidence. The committed fixture packet preserves the semantic protocol, but
  a third party cannot reproduce an agent's exact local dependency/cache state
  from this report alone.

## Reproduction

The durable semantic source of truth is
[`docs/evaluations/fixtures/competitive-benchmark-v2-followup/`](./fixtures/competitive-benchmark-v2-followup/manifest.md):
[manifest](./fixtures/competitive-benchmark-v2-followup/manifest.md),
[treatments](./fixtures/competitive-benchmark-v2-followup/arm-treatment.md),
[workloads](./fixtures/competitive-benchmark-v2-followup/workload-spec.md),
[oracle](./fixtures/competitive-benchmark-v2-followup/evaluator-spec.md), and
[reproduction procedure](./fixtures/competitive-benchmark-v2-followup/reproduce.md).

With Docker PostgreSQL 18 on port 5432, run reference controls only through:

```powershell
tmp/competitive-benchmark-v2/run-in-pg18.ps1 -Command 'npx --yes --package node@24.19.0 node tmp/competitive-benchmark-v2-followup/run-reference-controls.mjs'
```

The runner-owned raw evidence is intentionally outside the committed packet:

- T1/T2 evaluator and records:
  `tmp/competitive-benchmark-v2-followup/evaluations/recovery/`.
- W5 evaluator and records:
  `tmp/competitive-benchmark-v2-followup/evaluations/W5/`.
- Submitted sources and observational run records:
  `tmp/competitive-benchmark-v2-followup/primary-runs/`.
- Original-v2 non-pass classification:
  `docs/evaluations/fixtures/competitive-benchmark-v2-followup/v2-nonpass-classification.md`.

Do not use an agent self-test as a substitute for these evaluators, and do not
alter candidate files to manufacture a compatibility boundary during replay.

## Decision

Keep the original v2 conclusion unchanged: there is no aggregate winner, and
the historical Rules-only references are not directly comparable. For future
decision-making, use this follow-up only as controlled evidence for its three
defined workloads. Retain the runner-owned nonce fixture, independent oracle,
strict/live distinction, and documented treatment compliance. Any broader
builder, productivity, review-cost, or open-ended transaction study requires a
new preregistered experiment rather than extrapolation from these records.
