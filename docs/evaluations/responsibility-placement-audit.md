---
title: Responsibility Placement Audit
---

# Responsibility Placement Audit

## Decision record

**Outcome: done as an audit; no product change adopted.**

This audit evaluates Ashiba as one system containing an AI agent, Ashiba,
application code, PostgreSQL, and human review. It does not treat a shorter
CLI or a smaller codebase as success. The question is whether each current
responsibility has a measured reason to live in Core Proof, rules, an optional
accelerator, or the application.

Baseline: `922f1d847f630cc4c37a7d43119b7f8a99c5acfa` (PR #51 merge). PR #50
and #51 were confirmed merged before this branch began. The isolated baseline
worktree was clean and `pnpm verify` exited 0. Explicit PostgreSQL evidence
used a disposable local instance and failed rather than skipped when its URL
was absent.

## Evidence discipline

- **Repository evidence** is source, checked-in tests, previous checked-in
  evaluations, and this report.
- **Supplementary evidence** is the disposable control/harness output used in
  this audit. It validates narrow observations but is not a population study.
- **Observed** means an actual command, independently checked fixture, or
  existing test. **Inference** is bounded. **Unproven** is not silently
  promoted to a product claim.

## Acceptance items

| Acceptance item | Status | Evidence | Gap |
|---|---|---|---|
| Baseline, inventory, and maintenance surface | **done** | Clean `922f1d8`, full verify, command/source inventory. | LOC is a maintenance proxy, not removal evidence. |
| Core Proof assessment | **done** | Static, contract, PostgreSQL live, SQL Resource unit/live evidence. | Natural adoption and a unified terminal aggregation remain sparse. |
| Generator/scaffold assessment | **partial** | Existing Greenfield/Brownfield A/B/C plus new repetitive bootstrap. | No new independent Tool-Available run for every generator. |
| Refresh 1/10/100 assessment | **done** | Deterministic targeted/broad refresh harness. | Direct LLM repair was not a matched fresh-agent run. |
| SQL Resource fleet assessment | **done** | 100/5 deterministic comparison and 5-entry PostgreSQL smoke. | No 100-entry live PostgreSQL timing result. |
| Postgres-contract assessment | **partial** | Required-command fixture, six-type independent oracle, URL-absent failure. | Rules-only and Tool-Available Fresh Agent comparisons were not rerun. |
| Final placement and Constitution | **done** | This report and Constitution update. | No product change is justified by the incomplete cells. |

## Responsibility inventory and initial classification

| Responsibility group | What it solves | Runtime need | Deterministic value | Initial placement |
|---|---|---:|---|---|
| `check`, project/static/DDL/SQL lint | discovered static surface, generated drift | no | parser/rule/exit evidence | Core Proof |
| `check --full`, `--fix-generated` | selected command execution; safe derived refresh | no | selected-command exit; ownership boundary | Core Proof candidate / repair aid |
| contract and generated-mapper checks | SQL parameters/results/source hash/mapper agreement | no | contract and freshness facts | Core Proof |
| `feature query postgres-contract` | PostgreSQL prepare/catalog/driver contract | no | server-derived type and representation evidence | Core Proof candidate |
| SQL Resource snapshot/compare | portable resource plus fleet compatibility classification | no | deterministic affected-set classification | Core Proof candidate |
| `init`, feature/query scaffold/import, model-gen, tests scaffold | bootstrap and repeated mechanical output | no | deterministic output, but app fit varies | Optional Accelerator |
| refresh, format, query investigation, migration SQL, gate/perf/atlas helpers | mechanical repair, navigation, setup | no | varies by scale and input | Optional Accelerator / insufficient evidence |
| SQL meaning, transaction policy, DTO meaning, architecture, migration apply, test framework | application behavior and integration choices | application | not inferable generically | Application Responsibility |

The detailed source inventory found roughly 747 implementation lines for
`check`/project check, 844 for contract check, 1,041 for PostgreSQL contract,
816 for SQL Resource, 1,141 for `init`, 928 for model generation, and 3,810
in the consolidated feature command. Their substantial test surface is a
reason to demand proof of value, not evidence to remove them.

## Core Proof results

### What Ashiba proves uniquely

| Mechanism | Observed mechanical fact | Explicit limit | Final placement |
|---|---|---|---|
| `check` / static contract | discovered DDL/SQL/contract/generated surfaces agree | absent/skipped surfaces, execution, behavior, transactions | **Core Proof** |
| contract/mapper/freshness | named parameter/result shape, conservative types, source hash, derived drift | SQL meaning and actual database execution | **Core Proof** |
| `check --full` | the selected shell command exited zero after static check | lane coverage or test semantics | **Core Proof, scoped** |
| PostgreSQL contract | current PostgreSQL prepared/described canonical SQL and yielded catalog/driver evidence | rows, business behavior, transactions, custom parser runtime | **Core Proof candidate** |
| SQL Resource snapshot/compare | source-linked resource status and deterministic compatibility classification | migration apply, semantic equivalence, performance | **Core Proof candidate** |

The required PostgreSQL-contract fixture contained `bigint`, `numeric`, a
nullable text value, enum, numeric domain, and text array. The actual command
exited 0; an independent JSON oracle verified six result fields and a bigint
parameter. With no URL, the fixture exited 2 and was recorded `not-run`, not
passed.

The SQL Resource deterministic oracle compared 100 before and 100 after
entries. It identified exactly five affected IDs, with 95 unaffected, one
compatible, one contract-changed, one execution-breaking, and two
needs-review; a repeated comparison was deep-equal. A separate real
PostgreSQL smoke had five described entries before and after and identified
one `needs-review` without entry errors.

### Terminality and misuse

`check --full` can be a false-green when its selected command omits required
live proof (D14). SQL Resource has a related result-shape boundary: a snapshot
can retain an `error` entry and compare can emit `execution-breaking`, while a
caller that only observes process exit could still declare success. A command
result is terminal only for the facts named in its structured result.

The measured agent history supports separate proof commands plus a future
explicit aggregation of declared lane status; it does **not** support folding
all proof into one opaque `check` command. No completion schema was added in
this audit.

## Generator and scaffold evidence

### Greenfield and Brownfield

The prior checked-in AI-native construction baseline remains relevant
repository evidence, not an assumption:

| Cell | Observed result | Placement consequence |
|---|---|---|
| Greenfield Rules-only | PostgreSQL 6/6 pass without generator | generator is not necessary for correct construction |
| Greenfield Tool Available | no Ashiba command selected; PostgreSQL 4/4 pass | availability did not create natural generator adoption |
| Greenfield Tool Required | `init`/scaffold/model-gen worked only after duplicate-contract and mapper/name repair | useful bootstrap, not a correctness guarantee |
| Brownfield Rules-only | existing + feature PostgreSQL 8/8 pass | direct work fit the layered app |
| Brownfield Tool Available | Ashiba discovered but no command selected; 11/11 pass | discovery alone did not overcome architecture mismatch |
| Brownfield Tool Required | scaffold was tried in a disposable probe then discarded; 8/8 pass | application architecture remains application-owned |

This is evidence against making scaffold a Core requirement. It is not
evidence for deletion: it can still compress a compatible Greenfield start.

### Repetitive bootstrap

A new N=1/10/100 control generated identical named-parameter canonical SQL
and compared a direct deterministic contract writer against actual Ashiba
model generation. Both passed parameter/result oracles, preserved canonical
SQL, and had zero second-run churn.

| N | Direct outputs / bytes | model-gen outputs / bytes | Direct wall | model-gen wall |
|---:|---:|---:|---:|---:|
| 1 | 2 / 465 | 2 / 4,953 | 4 ms | 436 ms |
| 10 | 20 / 4,650 | 20 / 49,530 | 28 ms | 3,795 ms |
| 100 | 200 / 46,500 | 200 / 495,300 | 296 ms | in-process success; per-process probe timed out at query 65 |

This is **not** an LLM-versus-CLI score: the direct side is a deterministic
fixture writer, not a fresh LLM. It does show that model-gen makes a much
richer contract artifact and that naïvely spawning it 100 times is an
operational failure mode. Model generation stays an Optional Accelerator;
batch/in-process use needs a separate usability experiment.

No independent new Tool-Available generator run was performed. Existing
Tool-Available Greenfield/Brownfield observations selected none. Therefore
non-adoption is evidence about discoverability and fit, not a Remove verdict.

## Refresh and generated-artifact evidence

The refresh control changed one canonical SQL file in fleets of 1, 10, and
100 queries. It checked that canonical SQL outside that intended mutation,
`query.ts`, and human `logic.case.ts` remained untouched; all second runs were
no-ops and an undiscovered-feature fixture failed rather than passed.

| Fleet | Targeted refresh | Broad refresh | Broad generated files |
|---:|---:|---:|---:|
| 1 | 2 files / 9.270 ms | 32.471 ms | 4 |
| 10 | 2 files / 8.234 ms | 261.172 ms | 22 |
| 100 | 2 files / 9.248 ms | 2,572.156 ms | 202 |

The broad set is expected: with a human logic case present it refreshes two
metadata files for the changed query plus two generated ZTD-support files per
query. This is mechanically correct but increases review surface sharply.
Targeted refresh is valuable at small/local scope; broad refresh is an
Optional Accelerator for controlled fleet maintenance, not a mandatory
post-edit habit. Direct LLM repair remains unmeasured as a matched agent
condition, so no winner is claimed.

## Rules, architecture, and review surface

**Rule candidates** are canonical SQL ownership, parameter binding,
closed-world runtime syntax, generated artifacts not being authority, and
required proof-lane declaration. They guide agent choices but cannot replace
hash, catalog, or compatibility computation.

**Application responsibilities** remain transaction policy, business SQL
meaning, public DTO meaning, test framework/lane adequacy, migration apply,
locking/concurrency, and architecture. The Brownfield scaffold discard is
direct evidence that owning these in Ashiba would increase coupling.

The review hypothesis remains **open**. Targeted refresh leaves two derived
files, while broad refresh at 100 exposes 202. PostgreSQL contract and SQL
Resource reduce repeated manual type/fleet analysis, but agents still must
review canonical SQL, schema changes, transaction boundaries, application
contract edits, and the adequacy of declared lanes. No human intervention was
required for the disposable controls; that does not establish human-review
burden at production scale.

## Final placement

| Classification | Responsibilities |
|---|---|
| **Core Proof** | static project/contract/generated freshness checks; source hash; SQL/mapper parameter-result contract; scoped selected-command exit evidence |
| **Core Proof candidate** | PostgreSQL-derived contract; SQL Resource snapshot/compare, provided callers inspect per-entry status/classification |
| **Optional Accelerator** | init; feature/query scaffold/import; model-gen; test scaffold/support; targeted/broad refresh; format/query exploration; migration SQL/gate helpers |
| **Rule Candidate** | canonical SQL, binding, finite syntax, derived-not-authority, declared required proof lanes |
| **Application Responsibility** | architecture, transactions, business semantics, DTO meaning, migration application, test-framework and lane adequacy |
| **Remove Candidate** | none |
| **Insufficient Evidence** | natural adoption of postgres-contract/SQL Resource; generator value for independent Fresh Agents; batch model-gen UX; Atlas/perf helpers; a universal proof aggregator |

## Product changes and reverted experiments

No product change was adopted. The audit found two possible future P1 changes
but did not implement either: an explicit non-zero/structured gate for SQL
Resource error/breaking statuses, and a declared-lane aggregator. Both require
compatibility and fresh-agent evidence before changing CLI terminal behavior.

One fixture mistake was corrected rather than hidden: the first 100/5 SQL
Resource mutation left `q-005` unchanged, yielding four affected entries.
The corrected nullable-to-non-null mutation yielded the exact five. The
per-process 100-query model-gen probe timed out at query 65; it was excluded
from performance comparison rather than counted as success.

## Constitution update and remaining uncertainty

The Constitution is updated only to make the scoped Core Proof boundary and
review-surface evidence explicit. PostgreSQL-derived contract and SQL Resource
remain strong but scoped hypotheses rather than application-correctness
guarantees; proof-lane declaration remains open.

Dynamic SQL questions carried forward:

1. Which runtime variability truly needs syntax construction rather than a
   finite canonical-query set?
2. Can direct application closed-world maps be reviewed/measured without
   Ashiba owning their architecture?
3. Which resource compatibility classifications should require human review
   versus a policy gate?

Remaining P0: none newly found. Remaining P1: SQL Resource status/compare
terminality can be misread as process-level success; required-lane completeness
is still application/review-owned; broad refresh can create large generated
review surface; model-gen batch invocation lacks demonstrated ergonomic scale.

## Recommended next phase

**Dynamic SQL Necessity Audit**, beginning with real business applications and
an inventory of actual runtime variability. Do not implement a builder first.
The responsibility placement audit is sufficiently converged to move there,
while retaining the P1 terminality and batch-usability items as bounded
follow-up experiments.

## Self review

### Consistency review

- The report separates repository and supplementary evidence, names every
  partial cell, and does not treat skipped PostgreSQL as success.
- The corrected 100/5 mutation and excluded model-gen timeout remain visible.
- No local filesystem path appears in repository-facing text.

### Human acceptance review

- The value, actual placement decision, proof limits, and no-change outcome
  are visible before file details.
- **Follow-up:** run independent Tool-Available and Rules-only postgres/
  resource agent tasks before promoting either candidate to an unconditional
  Core requirement.
- **Nit:** compare output has no current terminal policy; this is deliberately
  not silently changed.
- **Review readiness:** ready as an evidence-bounded no-product-change audit.

**Non-blocking next decision:** accept the above placement and begin the
Dynamic SQL Necessity Audit, or request the bounded P1 terminality/batch
follow-up before that phase.
