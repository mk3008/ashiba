# AI-Native PostgreSQL Competitive Benchmark v2 Follow-up

## Executive summary

This follow-up tested five AI-assisted PostgreSQL data-access workflows on
three frozen application tasks: an atomic transfer (T1), a concurrent
work-item claim (T2), and a bounded brownfield pagination repair (W5). The
arms were Minimum Ashiba v1 (A), Prisma 8 RC (P), sqlc TypeScript/Node (S),
Drizzle (D), and Kysely (K). This is a **data-access workflow benchmark, not
an ORM feature-breadth benchmark**.

Each scored submission was evaluated by a runner that owned a nonce PostgreSQL
fixture and its oracle. There are 20 T1/T2 cells (five arms x two workloads x
two Fresh-Agent replicates) and 10 W5 cells (five arms x two replicates). The
runner-owned final result records are committed as
[`evidence/results.json`](./fixtures/competitive-benchmark-v2-followup/evidence/results.json),
not transcribed solely into this report.

For T1/T2, the live PostgreSQL oracle passed in 10 of 20 cells (failed in 9,
unevaluable in 1). The historical strict outcome was P 2, F 17, U 1. W5 had
9 strict passes and 1 strict failure; all ten W5 submissions reached the live
PostgreSQL oracle. These are observations for the pinned task contracts,
versions, fixture, model profile, and host—not tool rankings or population
success rates.

Most importantly, the detailed boundary of *treatment fidelity* was not
sufficiently specified before T1/T2 execution. The post-execution treatment
classification is therefore a secondary audit diagnostic. The primary
behavioral observation for T1/T2 is the live PostgreSQL oracle, and neither
the strict tally nor the audit taxonomy proves that a tool is intrinsically
stronger or weaker.

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
profile, and one PostgreSQL fixture. It is an **AI-assisted PostgreSQL
data-access workflow benchmark**, not an ORM feature-breadth benchmark. It is
not a capability survey, a tool productivity score, a general
transaction/concurrency result, or a measure of review cost, generated-code
burden, coupling, or natural user preference.

Migration systems, hosting, managed platforms, administrative tooling, and
cloud integration are out of scope. No arm loses credit merely because another
product offers one of those features. The 30-cell cross-workload total is
**bookkeeping only**: T1, T2, and W5 measure different constructs, so it is
not a benchmark score, success rate, or aggregate ranking.

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

The assignment, prompt, and pre-execution arm material did **not** specify the
detailed boundary between an ordinary workflow escape hatch and a substitute
workflow sufficiently to make treatment fidelity a primary T1/T2 rule. The
durable [treatment policy](./fixtures/competitive-benchmark-v2-followup/arm-treatment.md)
is therefore a post-hoc, evidence-linked audit taxonomy, not a claim of
preregistration. It cannot turn a live PostgreSQL pass into primary evidence
of behavioral failure. For T1/T2, live PostgreSQL behavior is the primary
result; strict/treatment results are secondary diagnostics.

## Workloads

| ID | Business situation and agent task | Important PostgreSQL behavior | Runner-owned pass oracle | Intended capability |
| --- | --- | --- | --- | --- |
| T1 — atomic account transfer | Move integer cents from one customer account to another and write an audit row. The agent implements a callable `transfer(from, to, amount)` against the supplied schema. | The exact `accounts(account_id, balance_cents)` and `transfer_audit` names must be used in the nonce schema. Debit, credit, and audit are one transaction; insufficient funds and an injected post-debit failure roll back. Values are bound runtime inputs. | Separate connections assert exact success state and audit row, no state change for insufficient funds or injected failure, nonce-safe access, and a compatible public boundary. | Implement an ordinary application transaction without partial state. |
| T2 — concurrent work-item claim | Two workers concurrently claim independent queued `work_items`; the agent exposes a callable claim boundary. | The supplied `work_items(id, state, claimed_by)` table is in the nonce schema. Two independent connections must not claim the same row; an injected post-update failure must roll back. `SKIP LOCKED` was permitted but not prescribed. | Two concurrent calls must return distinct claims; final committed rows must be correct; the rollback case leaves its row unclaimed. | Converge on PostgreSQL-safe concurrency and rollback through the submitted boundary. |
| W5 — brownfield investigation and tuning | An endpoint returns the correct page but is slow at production-like row counts. The agent investigates the executed query, obtains EXPLAIN evidence, improves it, and preserves behavior through the declared arm-specific baseline and frozen entrypoint. | The declared initial path is correct deep-offset pagination. The frozen runner independently captures `EXPLAIN (FORMAT JSON)`, checks result equivalence and regressions, and requires the frozen plan metric to improve. Exact historical editable starters are not reconstructable from durable evidence. | The fixed public boundary returns equivalent ordered pages and regressions, preserves frozen runner/core files, changes the candidate, and reduces the measured plan work. | Diagnose and improve a bounded PostgreSQL read path without a prescribed SQL rewrite. |

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

The three result axes are:

- **Live PostgreSQL (`P` / `F` / `U`)** — the runner-owned behavioral oracle
  passed, failed after a compatible invocation, or could not be invoked without
  changing a candidate. This is the primary behavioral observation.
- **Treatment fidelity (`pass` / `fail` / `unknown`)** — the post-hoc audit of
  whether retained evidence shows use compatible with the declared workflow.
  It is not a pre-registered primary T1/T2 rule. `unknown` means the evidence
  cannot sustain a classification.
- **Strict (`P` / `F` / `U`)** — the runner's composite final outcome. A strict
  P requires an evaluable frozen public boundary, live P, and treatment pass.
  Strict F means an evaluable submission did not satisfy an expressly frozen
  evaluator assertion or the secondary treatment audit. Strict U means no
  compatible submitted boundary was evaluable without changing candidate
  files. The frozen public-boundary contract remains relevant even if the
  database final-state oracle passed (for example, W5 CLI serialization).

The result table below presents all three axes rather than treating strict as
the behavioral oracle. Candidate `RUN.md` / `RUN-REPORT.md` material
is observational only (first useful signal, false-repair attempt, reruns,
files/diff, generated churn, review surface, coupling, and fallback); it is
not the pass oracle.

## Run matrix and observed results

The scored population is five arms x (T1 + T2) x two Fresh-Agent replicates =
20 transaction/concurrency cells, plus five arms x two W5 replicates = 10
cells. Replicate labels are not uniformly numbered because calibration, a
missing-packet dispatch, and one incomplete P-T1 directory were excluded before
scoring; the named records in
[`evidence/results.json`](./fixtures/competitive-benchmark-v2-followup/evidence/results.json)
are the authoritative scored population.

Read the following per-workload rows before the cross-workload total. They are
recalculated directly from the committed result file with:

```powershell
node docs/evaluations/fixtures/competitive-benchmark-v2-followup/evidence/summarize-results.mjs
```

| Workload | Cells | Strict P / F / U | Live PostgreSQL P / F / U | Treatment pass / fail / unknown | Primary reading |
| --- | ---: | --- | --- | --- | --- |
| T1 | 10 | 1 / 8 / 1 | 5 / 4 / 1 | 3 / 6 / 1 | Live PostgreSQL behavior is the primary observation; strict/fidelity is secondary. |
| T2 | 10 | 1 / 9 / 0 | 5 / 5 / 0 | 1 / 9 / 0 | Live PostgreSQL behavior is the primary observation; strict/fidelity is secondary. |
| W5 | 10 | 9 / 1 / 0 | 10 / 0 / 0 | 10 / 0 / 0 | Bounded fixed-entrypoint tuning result. K-W5-r2 failed strict JSON serialization while its database oracle passed. |
| All workloads | 30 | 11 / 18 / 1 | 20 / 9 / 1 | 14 / 15 / 1 | **Bookkeeping only, not a score, success rate, or ranking.** |

The sole live/strict U (`S-T1-r2`) did not create a fixture, so cleanup is
correctly `not-run`; each other T1/T2 record reports successful cleanup. All
ten W5 records report PostgreSQL 18 execution and successful nonce-schema
cleanup. The per-cell runner-owned outcome, candidate boundary, first failed
assertion, actual retained version evidence, nonce/cleanup status, and source
hashes are fields in `results.json` rather than claims copied by hand.

The detailed failure ledger is
[`evidence/transaction-concurrency-failures.md`](./fixtures/competitive-benchmark-v2-followup/evidence/transaction-concurrency-failures.md).
It contains every cell's Strict / Live / Treatment values and a failure-class
matrix. Its failures are tied to runner-record hashes and are not inferred from
agent narrative.

## Observed

1. The reference application passed every T1 oracle (success, insufficient
   funds, and injected post-debit rollback), T2 oracle (two distinct claims
   and rollback), and W5 oracle (equivalent results and plan work from 20,025
   to 25 rows visited). This validates the harness for its frozen fixtures; it
   is not a candidate result.
2. The two strict transaction/concurrency passes were `A-T1-r2` and
   `D-T2-r1`. The secondary strict diagnostic records live oracle failures,
   a missing callable boundary, or post-hoc treatment-fidelity findings such
   as a `psql`/node-postgres substitute. The primary behavioral result is the
   per-workload live PostgreSQL column above. Complete first-failure evidence
   is in the durable failure ledger, rather than inferred from agent
   self-reports.
3. The W5 runner independently observed result equivalence, regression-page
   equivalence, unchanged frozen runner/core hashes, candidate changes, and a
   reduction from 20,025 to 25 rows visited for each of its nine P records.
   K-W5-r2 failed because its changed candidate reached JSON serialization of
   a BigInt through the frozen entrypoint, not because the runner rewrote it.
   The exact historical editable W5 starter snapshots are not reconstructable,
   so this does not prove that all arms began from source-identical starters.
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

## Claim → evidence

| Claim | Durable evidence |
| --- | --- |
| Same Fresh-Agent profile and neutral packet process | [manifest](./fixtures/competitive-benchmark-v2-followup/manifest.md), [assignment template](./fixtures/competitive-benchmark-v2-followup/prompts/assignment-template.md) |
| Frozen T1/T2 contracts; declared W5 baseline condition | [workload specification](./fixtures/competitive-benchmark-v2-followup/workload-spec.md), [W5 starter limit record](./fixtures/competitive-benchmark-v2-followup/starters/README.md) — exact historical source is not reconstructable |
| Arm differences and post-hoc fidelity policy | [arm treatment record](./fixtures/competitive-benchmark-v2-followup/arm-treatment.md) |
| T1/T2/W5 reference controls pass | [reference controls](./fixtures/competitive-benchmark-v2-followup/reference/run-reference-controls.mjs), [evaluator](./fixtures/competitive-benchmark-v2-followup/evaluator/reference-oracle.mjs) |
| T1/T2 and W5 result totals | [results.json](./fixtures/competitive-benchmark-v2-followup/evidence/results.json), [summary script](./fixtures/competitive-benchmark-v2-followup/evidence/summarize-results.mjs) |
| T1/T2 first failures and taxonomy | [failure ledger](./fixtures/competitive-benchmark-v2-followup/evidence/transaction-concurrency-failures.md) |
| W5 20,025 → 25 plan work on strict P records | [results.json](./fixtures/competitive-benchmark-v2-followup/evidence/results.json), [W5 evaluator](./fixtures/competitive-benchmark-v2-followup/evaluator/W5/reference-evaluator.mjs) |
| Original-v2 non-pass taxonomy | [v2 classification](./fixtures/competitive-benchmark-v2-followup/evidence/v2-nonpass-classification.md) |
| Clone-based replay boundary | [reproduction procedure](./fixtures/competitive-benchmark-v2-followup/reproduce.md) |

## Inference

- Passing reference controls makes the follow-up's frozen oracle usable for
  interpreting the recorded candidate artifacts. It does not show that any
  tool generally supports all transaction, concurrency, or tuning work.
- In the frozen T1/T2 tasks, ten submissions reached a passing live PostgreSQL
  behavioral result. The strict 2/20 figure is a secondary composite
  diagnostic because detailed treatment-fidelity boundaries were
  under-specified before execution.
- The nine W5 passes show that this deliberately bounded deep-pagination
  investigation converged under the frozen entrypoint and declared baseline
  condition. They do not establish broad brownfield performance superiority or
  general EXPLAIN skill; exact historical starter equality cannot be audited.
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

## Threats to validity and evidence durability

### Internal validity

- Calibration defects, one missing-packet dispatch, and an incomplete P-T1
  directory were excluded before scoring rather than repaired into the scored
  population.
- The harness required corrections before this primary matrix; reference
  controls passed afterward. That validates only the frozen harness.
- Windows, npm, ESM, and runtime-dependency behavior can affect callable
  boundaries. These are recorded as observed failure modes, not tool-wide
  capability claims.
- Detailed treatment fidelity was under-specified before T1/T2 execution.
  Post-hoc classification is secondary and risks outcome-informed framing;
  live PostgreSQL is therefore the primary behavioral result for T1/T2.

### Construct validity

- Strict combines live behavior, frozen public-boundary compatibility, and a
  treatment-fidelity audit; it is not a pure behavioral measure.
- A fixed callable boundary can be less natural for some tools than their
  normal application integration. The runner adapter reduced shape differences
  but did not remove this risk.
- The exact editable W5 starters supplied to Fresh Agents are not durable.
  The declared deep-offset baseline condition and some retained hashes can be
  audited, but source-identical starting conditions across arms cannot.
- The benchmark compares data-access workflows, not ORM feature breadth.
  Migration, hosting, platform, admin, and cloud-integration features are
  deliberately neither credited nor penalized.

### External validity

- Two replicates per cell, one model/effort profile, one base commit, one host,
  one PostgreSQL fixture, pinned versions, and bounded workloads do not support
  an overall tool ranking or population-level rate.
- W5 supplied a known deep-offset condition and fixed entrypoint; it is not
  arbitrary production tuning.

### Reproducibility and replay

- The committed packet supports clone-based replay of fixtures, reference
  controls, evaluators, invocation, declared W5 baseline facts, and
  machine-readable result inspection. It does not reproduce original
  Fresh-Agent executions or historical W5 starter source.
- Full agent transcripts, shell logs, caches, database dumps, and candidate
  directories remain intentionally `tmp/`-only. Exact local dependency/cache
  states and natural-language execution traces are **not reconstructable from
  durable evidence**.
- Results retain final runner-owned outcomes and selected hashes, not every raw
  stdout stream. A reviewer can audit reported totals and replay reference
  controls, but cannot rerun a historical agent for byte-identical output.
- Agent-authored first-signal, rerun, churn, review-surface, coupling, and
  fallback notes remain descriptive evidence; no preregistered score converts
  them into a cross-arm metric.
- The original-v2 classification is limited to retained records. It does not
  reconstruct missing original prompts or change historical outcomes.

## Review A — skeptical external benchmark reviewer

Reviewed from the perspective of Prisma, sqlc, Drizzle, and Kysely maintainers:

- The report does not call this an ORM benchmark, does not rank the products,
  and excludes migration, hosting, platform, admin, and cloud features rather
  than penalizing their absence.
- Direct-driver and `psql` findings are no longer represented as
  pre-registered behavioral failures. They are an explicitly post-hoc,
  secondary treatment audit; T1/T2 live PostgreSQL behavior remains primary.
- The fixed callable boundary and Windows/npm/ESM environment can distort
  natural workflow use. Those risks remain limits, not explanations assigned
  to product capability.
- W5 fairness is the material unresolved issue: the exact historical editable
  starters are not reconstructable. The result supports its retained
  fixed-entrypoint observations, not an auditably source-identical
  cross-arm-starting-condition claim.

## Review B — reproducibility reviewer

A third party can inspect `results.json`, recompute the shown per-workload
counts with `summarize-results.mjs`, read the failure ledger and runner hashes,
and clone-replay the committed reference controls, fixture, and evaluator.
They cannot reconstruct original Fresh-Agent transcripts, exact dependency/cache
state, all candidate trees, or exact historical W5 starters. These are explicit
evidence limits; no report claim should require their reconstruction.

## Reproduction

The committed packet supports clone-based replay of **reference controls only**,
not the 30 nondeterministic Fresh-Agent executions. Follow the exact committed
[reproduction procedure](./fixtures/competitive-benchmark-v2-followup/reproduce.md).
From a fresh clone with Docker and PowerShell 7:

```powershell
docker compose -f docs/evaluations/fixtures/competitive-benchmark-v2-followup/docker-compose.pg18.yml up -d
Push-Location docs/evaluations/fixtures/competitive-benchmark-v2-followup
npm ci
Pop-Location
pwsh -NoProfile -File docs/evaluations/fixtures/competitive-benchmark-v2-followup/scripts/run-in-pg18.ps1 -Command 'npx --yes --package node@24.19.0 node docs/evaluations/fixtures/competitive-benchmark-v2-followup/reference/run-reference-controls.mjs'
```

This runs committed T1, T2, and W5 reference implementations through the
committed PostgreSQL 18 wrapper and evaluator; a `P` replay with cleanup `pass`
proves the fixture, reference implementation, and oracle are mutually
executable. It does not re-evaluate historical candidates. Inspect
[`evidence/results.json`](./fixtures/competitive-benchmark-v2-followup/evidence/results.json)
or run its committed
[`summarize-results.mjs`](./fixtures/competitive-benchmark-v2-followup/evidence/summarize-results.mjs)
to audit the 30-cell totals.

The durable packet includes the assignment template, treatment record,
workload/fixture specifications, declared W5 baseline facts (not historical
starter source), reference implementations, runner-owned evaluators,
invocation, result summary, and failure taxonomy.
Verbose agent logs, raw candidate directories, and orchestration artifacts are
deliberately `tmp/`-only. Do not use an agent self-test as an evaluator
substitute or alter a historical candidate to manufacture a boundary.

## Decision

Keep the original v2 conclusion unchanged: there is no aggregate winner, and
the historical Rules-only references are not directly comparable. For future
decision-making, use this follow-up only as controlled evidence for its three
defined workloads. Retain the runner-owned nonce fixture, independent oracle,
strict/live/treatment distinction, and explicitly post-hoc treatment audit.
Any broader
builder, productivity, review-cost, or open-ended transaction study requires a
new preregistered experiment rather than extrapolation from these records.
