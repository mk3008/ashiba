---
title: Evaluation report self-containment audit
---

# Evaluation Report Self-Containment Audit

## Purpose and method

This is a documentation-quality audit of every top-level
`docs/evaluations/*.md` report as of `origin/main`
`4c9e7df7a77c8b07a0fa6bb95cfcf5d48ea59b8b`. It does not rerun an experiment,
alter a historical result, or promote a formerly supplementary artifact into
new proof.

For each report, the audit checked whether the report alone names its question,
scope, treatments, workload or mutation meanings, oracle, run count/result
notation, decision, limits, and a usable reproduction pointer. “Durable” means
committed report, fixture, source, test, or Git-visible revision. An ignored
`tmp/` or `C:\\tmp` path is not durable reproduction evidence. Where durable
evidence cannot recover a detail, the correct remediation is an explicit
limit, not reconstruction from chat memory, local leftovers, or a new run.

Status meanings:

- **Sufficient** — the report supplies the needed context and durable pointers
  for its bounded claim.
- **Patched** — this audit added concise, evidence-backed context or an
  explicit evidence limit.
- **Partial — evidence unavailable** — the conclusion remains recorded, but
  at least one required historical definition, environment detail, or exact
  reproduction input exists only in disposable evidence.
- **No change needed** — an informational comparison rather than a run matrix;
  its stated bounds and committed source pointers already match its claim.

## Ledger

| Report | Question clear | Workloads / treatments defined | Oracle and result notation clear | Durable reproduction basis | Status and action |
| --- | --- | --- | --- | --- | --- |
| [ai-maintenance-ab](./ai-maintenance-ab.md) | yes | yes — four maintenance changes, Before/After cohorts | yes — independent final-diff evaluator; `partial` explained | immutable baseline commits, but run records/commands are not linked durably | **Partial — evidence unavailable**; retain its limits, do not recreate raw measurements. |
| [ai-native-competitive-value-benchmark](./ai-native-competitive-value-benchmark.md) | yes | yes — five arms and W1–W5 labels with broad tasks | yes — strict gate versus arm self-report | base commit/hash retained; runner and prepared arm artifacts disposable | **Partial — evidence unavailable**; historical pilot already says Fresh-Agent comparison was not done. |
| [ai-native-construction-baseline](./ai-native-construction-baseline.md) | yes | yes — A/B/C and Greenfield/Brownfield, with committed fixtures | yes — parent PostgreSQL reruns and labels | committed [fixture set](./fixtures/ai-native-construction/README.md); individual logs are supplementary | **Sufficient** for its bounded pilot claim. |
| [ai-native-postgresql-competitive-benchmark-v2](./ai-native-postgresql-competitive-benchmark-v2.md) | yes | patched — W1–W5/B1 legend and 50-run matrix now explicit | yes — P/F/U and runner-owned gate | base/runtime/results durable; exact workload/evaluator files are tmp-only | **Patched**; explicitly limits exact reproduction to a future new experiment unless inputs are committed. |
| [dynamic-mechanism-value-ablation](./dynamic-mechanism-value-ablation.md) | yes | mostly — Safe Sort and SSSQL subtraction | yes | named evidence is under tmp | **Partial — evidence unavailable**; preserve the existing tmp-only warning. |
| [dynamic-sql-necessity-audit](./dynamic-sql-necessity-audit.md) | yes | yes — requirement taxonomy and candidate mechanisms | mostly — mixed observations and hypotheses separated | fixtures and fresh-agent evidence are not fully durable | **Partial — evidence unavailable**; no invented command sequence. |
| [minimum-ashiba-controlled-rerun](./minimum-ashiba-controlled-rerun.md) | yes | yes — Rules Only versus mechanisms, W1–W5 | yes — strict evidence rejection distinguished from supplementary observation | runner/environment record is not committed | **Partial — evidence unavailable**; its negative conclusion already preserves the key limit. |
| [postgres-contract-query-builder-comparison](./postgres-contract-query-builder-comparison.md) | yes | yes — Ashiba/Drizzle/Kysely and two query shapes | yes — row, hostile-input, type, and lock observations | disposable comparison fixture is supplementary; internal live tests are named but not an exact reproduction recipe | **Partial — evidence unavailable**. |
| [proof-lane-declaration-pilot](./proof-lane-declaration-pilot.md) | yes | yes — declared proof lanes and D14 conditions | yes — evidence classes and partial status | agent reports are explicitly disposable | **Partial — evidence unavailable**. |
| [raw-sql-change-loop](./raw-sql-change-loop.md) | patched | patched — four mutations and two workflows | patched — test fixture is the drift oracle | committed test source; pinned historical environment unavailable | **Patched**; adds scope, run count, oracle, and durable source link. |
| [reproducibility-minimum-enforcement-ablation](./reproducibility-minimum-enforcement-ablation.md) | yes | yes — A/B, W1–W5, three runs each | yes — nonce-bound independent results | exact harness/run records are not committed | **Partial — evidence unavailable**. |
| [responsibility-placement-audit](./responsibility-placement-audit.md) | yes | yes — responsibility inventory and proof lanes | yes — evidence discipline and classifications | prototype/fresh-run evidence is partly tmp-only | **Partial — evidence unavailable**. |
| [schema-compatibility-and-portability-comparison](./schema-compatibility-and-portability-comparison.md) | yes | yes — drift mutations and 21-resource matrix | yes — compile/runtime and catalog classifications | disposable comparison project is not committed as a fixture | **Partial — evidence unavailable**. |
| [sql-tooling-competitive-benchmark](./sql-tooling-competitive-benchmark.md) | yes | yes — tool boundaries, mutations, and non-goals | yes — observed versus unproven separation | source/tests and cited versions support the bounded review | **Sufficient** for a qualitative tooling benchmark, not a Fresh-Agent result. |
| [verification-value-audit](./verification-value-audit.md) | yes | yes — mutation matrix and verification lanes | yes — explicit false-positive/negative boundaries | committed repository changes/tests are identified | **Sufficient** for its repository-audit conclusions. |
| [verifier-trust-and-cli-minimization](./verifier-trust-and-cli-minimization.md) | yes | yes — defect corpus and pilot condition | yes — live checks separate from agent narrative | fresh-agent artifacts are not durable | **Partial — evidence unavailable**. |
| [verify-repair-value-ablation](./verify-repair-value-ablation.md) | yes | yes — D1/D2, A/B, three Fresh Agents per cell | yes — final independent runs and false-repair distinction | fixtures/raw ledger are explicitly ignored under tmp | **Partial — evidence unavailable**. |

## Cross-report findings

The most frequent defect is a **durable reproduction gap**: reports often
describe an evaluator accurately but place its prompt, fixture, runner record,
or exact command only under `tmp/`. The next most frequent issue is abbreviated
workload labels whose detailed contract cannot be reconstructed after the
disposable run directory is gone.

This audit does not treat those gaps as failed experiments. It limits what a
reader can independently reproduce: reported conclusions remain historical
records, while exact reruns require a new experiment unless its small frozen
inputs are committed. Large logs and raw JSON need not be committed; a compact
fixture, workload specification, evaluator/oracle description, environment
manifest, and one invocation command normally are enough.

## Standard template for future evaluation reports

```md
# <Experiment name>

## Question
## Scope and non-scope
## Environment
Base commit; model/profile; runtime, database, tool/driver versions; fixture identity.
## Treatments
Spell out every arm and what differs.
## Workloads
| ID | Scenario | Agent task | Capability measured | Runner-owned oracle |
## Evaluator / Oracle
Distinguish candidate self-report from independent evidence.
## Run Matrix
`<workloads> x <arms> x <replicates> = <runs>`; define P/F/U before results.
## Observed
## Inference
## Limits
State `Not reconstructable from durable evidence` where applicable.
## Reproduction
Committed fixture/spec, command, and pointer to optional raw evidence.
## Decision
```

The template preserves historical accuracy: later evidence may be linked as a
separate forward pointer, but it must not overwrite the decision that the
original experiment actually made.
