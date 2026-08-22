# AI-Native PostgreSQL Competitive Benchmark v2

## Decision record

**Outcome: completed comparative execution; no aggregate winner.** This record
reports the fixed 5-arm, 5-workload, two-replicate experiment and its separate
composition control. It is evidence about the exact frozen treatment, not a
general product ranking or a capability survey.

The five primary arms were Minimum Ashiba v1 (A), Prisma 8 Release Candidate
(P), sqlc TypeScript/Node (S), Drizzle (D), and Kysely (K). The base was
`origin/main` at `5df581808df18cef5895517ab8e8f6ec01ad11b3`. The frozen runtime
was portable Node `v24.19.0` and PostgreSQL 18.1 (`server_version_num`
`180001`). `tmp/competitive-benchmark-v2/manifest.json` contains the exact
versions and arm preflight evidence.

No Ashiba product source was changed for this experiment. The experiment's
candidate implementations, runner-owned adapters, evaluator records, mutation
matrix, and orchestration records are disposable evidence under `tmp/`.

## Source issue or request

The question was whether Minimum Ashiba v1 can be measured alongside Prisma
8, sqlc, Drizzle, and Kysely for bounded, ordinary PostgreSQL work performed
by comparable Fresh Agents. The experiment needed to distinguish a candidate's
own success claim from an independent live PostgreSQL result, while preserving
an open-ended composition task outside the ordinary-workload comparison.

## Method and result protocol

The preregistered primary treatment consists of W1--W5 and two independently
started Fresh-Agent replicates for every arm/workload cell: `5 × 5 × 2 = 50`
primary cells. The fixed treatment specified the same `luna_worker` /
`gpt-5.6-luna` / high-effort profile, permissions, 45-minute timebox, Node 24
runtime, PostgreSQL 18 fixture, and neutral arm instruction. It did not give a
candidate another run's outcome or evaluator assertion. A third replicate was
permitted only for a documented split; none is included in the primary table.

The runner, rather than the candidate, created a fresh nonce schema/database,
ran an independent evaluator, and cleaned up. A strict pass therefore means
both a compatible public boundary and the runner-owned live PostgreSQL oracle
passed. It does not mean that an agent's own test or run record passed.

### Workload legend and retained definition boundary

The primary matrix is **5 arms x 5 workloads x 2 Fresh-Agent replicates = 50
primary runs**. B1 adds one non-scoring run per arm. The following is the
maximum workload definition recoverable from this committed report. The exact
prompts, SQL fixtures, expected values, and evaluator assertions were kept in
disposable `tmp/` artifacts and are **not reconstructable from durable
evidence**; this table intentionally does not infer them from a result label.

| ID | Retained business / technical situation | Required behavior retained in this record | Important PostgreSQL / SQL characteristic retained in this record | Runner-owned pass oracle | Intended capability |
| --- | --- | --- | --- | --- | --- |
| W1 — find | A bounded ordinary lookup. The report's durable label is only “find.” | Expose the frozen public boundary and satisfy its live request/response contract. | Exact query shape, schema, and value contract are not reconstructable from durable evidence. | Compatible public boundary plus the independent live evaluator pass. | Deliver a bounded PostgreSQL lookup through the frozen interface. |
| W2 — filtered list | A bounded filtered-list request. | Return the frozen list contract; P and D were remeasured after an evaluator-only enum-input correction. | The retained evidence identifies enum input and a list boundary, but not the complete filter, order, or pagination contract. | Compatible public boundary plus the independent live evaluator pass. | Implement a bounded list/filter contract without relying on self-report. |
| W3 — create | A create request against the frozen users contract. | Expose a create boundary compatible with the evaluator's users contract. | A BigInt codec requirement and a users-contract mismatch appear in failures; the exact insert and schema contract are not reconstructable from durable evidence. | Compatible public boundary plus the independent live evaluator pass. | Implement a create path and preserve its database/value boundary. |
| W4 — transfer + claim | A two-part state-changing workflow: transfer plus claim. | Produce the evaluator's required final state through the frozen public boundary. | It exercised a final-state transaction/concurrency contract; exact tables, locking and failure scenarios are not reconstructable from durable evidence. | Compatible public boundary plus the independent live final-state oracle. | Converge on a multi-step PostgreSQL state transition. |
| W5 — finite ordering | A bounded ordering request. | Return the frozen ordered result and the required candidate SQL/EXPLAIN protocol evidence. | It concerns finite ordering and SQL/EXPLAIN evidence; exact allowed keys, row cardinality, and plan assertion are not reconstructable from durable evidence. | Compatible public boundary, required SQL/EXPLAIN protocol, and the independent live oracle pass. | Expose finite, reviewable ordering with query-plan evidence. |
| B1 — open-ended composition control | A separate open-ended composition task. | Satisfy the frozen composition contract once per arm. | The report preserves that it was outside the primary score; its exact composition language and assertion set are not reconstructable from durable evidence. | Runner-owned composition oracle. | Explore a broader composition boundary without ranking W1–W5. |

This is a documentation limit, not a new experimental result. A future
reproduction needs a committed workload specification before it can claim to
recreate the original v2 cells.

In the table below, each value is `r1 / r2`:

- **P** — strict runner-owned final pass with a live PostgreSQL pass.
- **F** — runner invoked an evaluable boundary, but the independent protocol or
  live oracle failed.
- **U** — a runner-owned inspection found no compatible public boundary for
  the frozen workload, or the boundary could not provide the required protocol
  evidence without modifying the Fresh-Agent files. `U` is a strict non-pass,
  not a missing measurement.

This is a result matrix, not a score. No totals, weights, rankings, or
aggregate score are computed.

## Observed

### Primary strict-result matrix

| Arm | W1 find | W2 filtered list | W3 create | W4 transfer + claim | W5 finite ordering |
| --- | --- | --- | --- | --- | --- |
| A — Minimum Ashiba v1 | P / P | P / P | P / P | F / F | F / F |
| P — Prisma 8 RC | F / F | P / P | F / F | U / F | P / F |
| S — sqlc TypeScript | F / F | F / F | F / P | U / F | U / U |
| D — Drizzle | U / U | P / F | P / P | U / F | U / U |
| K — Kysely | P / P | P / P | P / U | F / F | P / P |

Every table position corresponds to a materialized direct child of
`tmp/competitive-benchmark-v2/primary-runs/`; there are 50 primary directories.
The supporting records are runner-owned evaluator records and adapters in
`tmp/competitive-benchmark-v2/primary-evaluator/`, with candidate/run evidence
in the corresponding primary directory. The runner records include the nonce
schema/database, portable Node version, PostgreSQL server version, first
failing assertion when applicable, and cleanup status.

The observed failure modes matter more than a pass count:

- A passed the three user workloads but failed both W4 implementations and
  both W5 public boundaries under the strict runner.
- P passed both W2 replicates after an evaluator-only P0 correction and one W5
  replicate. Its W1/W3 failures include references fixed to `public` under a
  nonce schema and an explicit BigInt codec requirement; the W5 r2 boundary
  emitted no required JSON response.
- S passed only W3 r2. Several cells could not resolve their declared runtime
  boundary or did not expose the frozen interface; W5 did not supply the
  required SQL/EXPLAIN protocol without altering candidate files.
- D passed W2 r1 and W3 r1/r2. Its other recorded failures include unavailable
  public boundaries, incompatible module entry points, and W4 final-state
  mismatches. Its W5 row-only protocol did not provide the required candidate
  SQL/EXPLAIN response independently.
- K passed both W1 and W2 replicates, W3 r1, and both W5 replicates. W3 r2
  exposed a different users contract, while both W4 attempts failed the
  runner's transfer/claim oracle.

### B1: open-ended composition control

B1 ran once per arm and is explicitly outside the primary score surface.
All five runner-owned B1 records are **F** (`A`, `P`, `S`, `D`, and `K`): each
failed the composition oracle. This is not evidence that an arm cannot support
all open-ended composition; it says that no submitted B1 boundary satisfied
this benchmark's frozen composition contract. It must not be used to rank the
ordinary W1--W5 workloads.

### Freshness and exclusion protocol

`tmp/competitive-benchmark-v2/fresh-runs/` is calibration-only. It is not a
primary result source. The initial dispatches that wrote into that location are
retained as invalid/calibration evidence and are excluded from this record.
Only newly created direct children named
`tmp/competitive-benchmark-v2/primary-runs/<ARM>-<W>-r<N>` form the matrix.
Runner-owned adapters absorb candidate CLI/function differences; candidates
and product source were not edited to turn an evaluation into a pass.

The evaluator was repaired before promotion only when the harness itself was
wrong. Before evidence for the W2 enum-input and W5 cardinality defects is
preserved beside the evaluator. The later P-W2 and D-W3 remeasurements are
adapter/evaluator-only remeasurements; the prior failing evidence remains
retained. This prevents a repaired harness result from overwriting the
historical failure observation.

### Evidence dimensions and telemetry limits

Candidate run records retain attempted commands, first useful signals where
produced, failures/reruns, changed-file and generated-artifact observations,
review surfaces, coupling notes, and W5 SQL/EXPLAIN material. The runner-owned
records are the authority for strict final pass/fail, live PostgreSQL behavior,
and cleanup. These two evidence classes are deliberately not collapsed into a
single productivity metric: record detail is heterogeneous, and no normalized
review-time, generated-churn, coupling, or false-repair ranking was
preregistered.

`tmp/orchestration-metrics/competitive-benchmark-v2/metrics.jsonl` is
append-only and records orchestration attempts. Per-agent input/output/total
token telemetry, exact credits, and exact platform wall time are **unavailable**
in the platform records (`null` with `usage_source: "unavailable"`). This
report does not estimate or fabricate them.

### Historical Rules-only reference

The Rules-only findings in earlier evaluation documents are historical
references, not another arm in v2. They used different fixtures, workload
contracts, runner protocols, and/or evidence handoff. They are therefore **not
directly comparable** with this matrix and are not used in any v2 conclusion.

## Inference

1. A strict runner-owned boundary is useful experimental infrastructure: it
   prevented self-reported success, a non-nonce `public` reference, a missing
   runtime dependency, incomplete public contracts, and protocol-only evidence
   from being promoted to live passes.
2. No arm is a demonstrated overall winner. The observed successes and
   failures are workload- and replicate-specific, especially because all W4
   cells and all B1 cells failed the independent gate.
3. The result does not establish comparative agent productivity, review cost,
   generated-code burden, coupling, or natural tool preference. The retained
   evidence is useful for investigating those questions but was not normalized
   into a comparable measure.
4. A strict failure does not establish a general product limitation. It proves
   only that this Fresh-Agent artifact did not satisfy the frozen boundary,
   nonce-isolation, and independent-evaluator contract in this replicate.

## Preregistered hypotheses, still hypotheses

- Canonical SQL plus Rules and a small mechanical proof may converge for
  ordinary bounded PostgreSQL queries while keeping a compact SQL review and
  investigation surface.
- Prisma 8's contract-first mechanisms may improve convergence or brownfield
  safety.
- sqlc may provide a strong SQL-first typed contract at the cost of a
  generation/vet and derived-code surface.
- Drizzle and Kysely may be advantageous for open-ended runtime composition;
  B1 was designed to explore that separately.

The matrix does not prove or disprove these hypotheses. In particular, the B1
failures are not a valid substitute for a broader builder-control study.

## Attainment against the benchmark plan

| Acceptance item | Status | Evidence | Remaining limit |
| --- | --- | --- | --- |
| Freeze five arms and common runtime | done | `manifest.json`, five preflight records, Node 24/PG18 evaluator records | Applies only to the pinned versions/base. |
| Deterministic runner-owned W1--W5/B1 evaluation | done | evaluator source, self-test records, nonce-schema records, preserved P0 before evidence | The portable runner does not claim PostgreSQL log/connection-spy evidence. |
| 50 primary cells plus separate B1 | done | 50 `primary-runs` cells, five B1 cells, matrix above | Invalid calibration dispatches remain excluded. |
| Strict independent outcome per submitted cell | done | runner-owned adapter/evaluator result for every matrix cell | `U` is a measured non-pass caused by an incompatible boundary, not a product-wide conclusion. |
| Comparative productivity/review-cost ranking | not done by design | heterogeneous candidate records retained | No normalized telemetry or preregistered scoring model; no score is reported. |
| Product source changes | done — none | product source was kept outside the experiment; artifacts are under `tmp/` plus this report/links | This is an evaluation artifact change only. |

## Reproduction and review basis

Run the evaluator only via
`tmp/competitive-benchmark-v2/run-in-pg18.ps1`; it fixes portable Node 24,
PostgreSQL 18, and nonce database/schema isolation. Review the report alongside
the frozen `manifest.json`, `preregistration.md`, workload requirements,
evaluator specification, `primary-evaluator/` records/adapters, and the
append-only orchestration metrics ledger. The reported matrix is repository
documentation; the local runner and PostgreSQL execution artifacts are
supplementary reproducibility evidence.

### Durable-evidence limit

The base commit, runtime versions, arm names, run matrix, notation, and
observed results above are durable in this report. The named manifest,
preregistration, workloads, runner script, adapters, evaluator source, and
run records were intentionally left under ignored `tmp/`; they are not
versioned reproduction inputs. Consequently, a third party can audit this
record's stated conclusion but cannot reproduce its exact workload/evaluator
contract from the repository alone. Do not substitute a newly designed
workload or fresh run for the missing evidence and present it as v2; that
would require a new experiment.

## What a reviewer should decide next

Do not use this record to select an overall data-access tool. Use it to decide
whether a follow-up should target one clearly stated question—for example,
repairing W4 convergence under the same runner, or designing a separate,
fully specified open-ended composition benchmark—without changing the product
to fit this result.

### Later evidence

The [v2 follow-up](./ai-native-postgresql-competitive-benchmark-v2-followup.md)
separated W4 into an atomic-transfer workload and a concurrent-claim workload,
then added a bounded brownfield tuning workload with a committed semantic
fixture packet. It also classifies the preserved v2 non-passes. That later
evidence does not alter this historical matrix, decisions, or durable-evidence
limits.
