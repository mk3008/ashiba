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

## What a reviewer should decide next

Do not use this record to select an overall data-access tool. Use it to decide
whether a follow-up should target one clearly stated question—for example,
repairing W4 convergence under the same runner, or designing a separate,
fully specified open-ended composition benchmark—without changing the product
to fit this result.
