# Current Ashiba Competitive Benchmark v3

## Research record

This report compares six frozen TypeScript/PostgreSQL data-access treatments
under a shared runner-owned application boundary. The subject is **Current
Ashiba**, a raw SQL harness whose measured treatment is:

```text
visible SQL → compileNamedParameters → bindNamedParameters → native pg
```

The comparison is descriptive. It does not assign an overall score or say
that a framework is generally better or worse. Exact prompts, packets,
candidate snapshots, attempt logs, runner results, and hashes are retained
alongside this report. The compact source of record is
[raw-results.json](./raw-results.json); it is not a replacement for immutable
attempt evidence.

## Protocol

The initial preregistration was committed before scored execution. Its
amendments preserve, rather than rewrite, earlier protocol states. The
eligible primary packet is the v2 packet frozen at
`7988e3bedb84ee918c928afa33a58dbbcf826a37`; see
[preregistration](./PREREGISTRATION.md), amendments, and the
[correction ledger](./EXCLUSION_AND_CORRECTION_LEDGER.md).

The profile-required primary condition specifies Node 24.18.0, PostgreSQL
18.6, strict TypeScript, a fresh candidate directory, a fresh agent session,
a nonce database role and schema, and a shared read-only runner/packet.
Candidate repairs are capped at two after the initial response. The preserved
candidate and runner evidence establishes the packet and database-directory
isolation; historical per-cell agent-session dispatch is not independently
captured. The intended model/effort profile is therefore profile-derived
rather than dispatch-confirmed. See
[ORCHESTRATION_METRICS_LIMITATIONS.md](./ORCHESTRATION_METRICS_LIMITATIONS.md).
Parallel execution is throughput only; wall time is not a comparative metric.
Windows OS-user and network isolation were not available, so database-role/
schema isolation is not overstated as full-process isolation.

## Treatments and versions

| Arm | Frozen treatment | Release/status boundary |
| --- | --- | --- |
| A | `@ashiba-ts/named-parameters` 0.1.0 tarball plus `pg` | Current Ashiba package from the stated baseline |
| P | `prisma` 8.0.0-rc.12 plus `@prisma/orm-postgres` 8.0.0-rc.8 | Prisma 8 Release Candidate, not GA or stable |
| S | sqlc 1.31.1 plus `sqlc-gen-typescript` 0.1.3 | sqlc core stable; TypeScript plugin early access |
| D | `drizzle-orm` 0.45.2 | Frozen stable line |
| K | `kysely` 0.29.5 | Frozen package resolution |
| G | `pg` 8.23.0 | Native-driver control |

The official-source and artifact details are in [MANIFEST.md](./MANIFEST.md).
Prisma 7 is historical context only and was not scored.

## Primary workloads

| Workload | Construct measured | Final live observations |
| --- | --- | --- |
| G1 | Bounded business application and maintenance request | first 9 pass / 3 fail; final 9 pass / 3 fail |
| T1 | Atomic debit/credit/audit transaction | first 9 pass / 3 fail; final 9 pass / 3 fail |
| T2 | Concurrent work claim | first 10 pass / 2 fail; final 10 pass / 2 fail |
| Q1 | Complex PostgreSQL query, trace, and EXPLAIN task | first 6 pass / 6 fail; final 9 pass / 3 fail |

Those counts are cell observations, not tool scores. The per-cell record,
including each final state, is in `raw-results.json`; direct first-attempt
oracle/live status, first-pass command slots, and additional attempts are
retained separately. The index intentionally does not infer causal repair
categories where the original schema did not record them.

The complete per-cell and per-arm transcription, including first-pass command
slots, final live status, frozen treatment review, and retained attempt counts,
is [RESULT_MATRICES.md](./RESULT_MATRICES.md). It is descriptive rather than a
score table.

## Primary findings

### A. What Current Ashiba is demonstrably good at

**Observed.** Some Ashiba candidates passed each of G1, T1, T2, and Q1 while
meeting the frozen Ashiba treatment review. The runner verified parameter
value isolation, finite-sort handling, pagination, transaction outcomes,
concurrent final state, and, for Q1, runner-collected SQL/EXPLAIN evidence.
This is direct evidence that the current small primitive can participate in
these bounded tasks without an Ashiba CLI, generator, driver adapter, or
application framework.

### B. Where Current Ashiba clearly loses

**Not established by this record.** The current matrix contains final Ashiba
failures and successful observations for every comparison arm, while Drizzle
has eight recorded primary final-live passes. It is not designed or powered
to establish a universal loss or superiority result. The
benchmark also does not provide a completed migration-ecosystem or
open-ended-composition comparison from which to claim that Ashiba matches
integrated schema, migration, or report-builder workflows.

### C. Mixed or inconclusive cases

**Observed.** Ashiba and native `pg` are deliberately separate treatments.
The common runner demonstrates the additional deterministic named-parameter
boundary only where the Ashiba treatment was used; it does not measure a
long-run defect rate or establish a universal marginal benefit over plain pg.
The evidence remains mixed on agent familiarity, repair cause, and secondary
architecture/exit controls. SD and E1 now have durable secondary schema
documents, but those controls remain non-aggregate and fixture-specific.

## Required interpretation by measured topic

### D. Architecture fitness

**Observed.** AF-V and AF-L retain r1/r2 baseline-delta evidence, with
heterogeneous r2 paths. **Inference boundary.** This does not support an
arm-level architecture preference or a general brownfield conclusion.

### E. AI familiarity and discoverability

**Observed.** Historical cell evidence does not preserve a dispatch-confirmed
Fresh-Agent session for every primary cell, nor token/credit telemetry.
**Inference boundary.** Model familiarity cannot be measured here; the frozen
profile is an intended condition only. See
[ORCHESTRATION_METRICS_LIMITATIONS.md](./ORCHESTRATION_METRICS_LIMITATIONS.md).

### F. Adoption cost

**Observed.** The six frozen treatments differ in packages, configuration,
and generated-state surfaces recorded in the packet and candidate snapshots.
**Inference boundary.** This record does not normalize those surfaces into a
single adoption-cost score.

### G. First-pass success and retained attempts

**Observed.** Direct first-attempt oracle/live records are 34 P / 14 F;
terminal live records are 37 P / 11 F. By arm, first/final P counts are A
4/5, P 6/6, S 3/4, D 8/8, K 6/7, and G 7/7 (out of eight each). There are 19
additional primary attempt records. **Inference boundary.** The source does
not declare a normalized cause for each additional attempt, and orchestration
retries are unavailable rather than counted as candidate repairs. See
[RESULT_MATRICES.md](./RESULT_MATRICES.md) and [REPAIR_ANALYSIS.md](./REPAIR_ANALYSIS.md).

### H. Plain `pg` marginal value

**Observed.** Ashiba and native `pg` are separate frozen treatments; their
final P counts are 5 and 7 respectively, and their first P counts are 4 and
7. **Inference boundary.** Two replicates and unclassified repair causes do
not establish the long-run marginal defect-prevention value of named binding.

### I. Safety authority differences

**Observed.** The runner, PostgreSQL, candidate code, tool/runtime,
TypeScript, and review carry distinct controls. **Inference boundary.** This
benchmark does not rank detection stages as intrinsically better.

### J. Operational debugging and SQL visibility

**Observed.** Q1 requires source tracing, executed SQL/parameter evidence, and
EXPLAIN; first/final records are 6/9 P out of 12. **Inference boundary.** Q1
is DB-centric and does not establish incident-debugging ergonomics generally.

### K. Finite dynamic SQL

**Observed.** G1 runner controls finite sort vocabulary, value separation,
filters, and pagination; its first and final results are both 9 P / 3 F.
**Inference boundary.** That bounded condition does not cover arbitrary SQL
syntax composition.

### L. Open-ended composition

**Observed.** X1 H-007 r2 has terminal P records for A, S, D, K, and G and an
F record for P; r1 is preserved correction context. **Inference boundary.** A
single corrected non-aggregate replicate per arm is insufficient for a
report-builder recommendation. The r3 evidence-preservation remeasurement is
explicitly excluded/non-comparable after its initial sources diverged or hit
an environment-preparation fault; it contributes no X1 outcome or repair
comparison.

### M. Transactions

**Observed.** T1 first and final records are both 9 P / 3 F, with runner-owned
rollback controls. **Inference boundary.** This does not compare all
transaction API designs or production failure modes.

### N. Concurrency

**Observed.** T2 first and final records are both 10 P / 2 F under the frozen
claim oracle. **Inference boundary.** The result does not generalize to other
isolation levels or concurrency patterns.

### O. Prisma 8 RC contract/framework trade-offs

**Observed.** Prisma has 6/8 first and final P records; its frozen treatment
review passes 8/8. Final adjudication records six
`qualified-inline-contract` and two `emitted-contract-plus-raw-SQL` paths,
all through the Prisma runtime. **Weakest boundary.** This is not evidence of
the complete generated Prisma client lifecycle. See
[PRISMA_TREATMENT_ADJUDICATION.md](./PRISMA_TREATMENT_ADJUDICATION.md).

### P. sqlc generation trade-offs

**Observed.** sqlc has 3/8 first P and 4/8 final P records; frozen treatment
review passes 7/8. **Weakest boundary.** The TypeScript plugin is early access,
and these cells do not establish sqlc core behavior in other languages.

### Q. Drizzle trade-offs

**Observed.** Drizzle has 8/8 first and final P records under its frozen
treatment review. **Weakest boundary.** Eight bounded observations are not a
general Drizzle superiority result.

### R. Kysely trade-offs

**Observed.** Kysely has 6/8 first P and 7/8 final P records under frozen
treatment review. **Weakest boundary.** This does not measure its ecosystem,
migration, or open-ended-composition breadth.

### S. Schema and migration ecosystem

**Observed.** SD records fixture-specific detection stages and E1 records
bounded native-pg removal controls; Ashiba does not own migration tooling.
**Inference boundary.** Neither control ranks migration ecosystems.

### T. Historical Ashiba to Current Ashiba delta

**Observed.** Current treatment excludes historical CLI, generated metadata,
source-hash freshness, adapters, and scaffold surfaces. **Inference boundary.**
Historical benchmark outcomes are not reused as Current Ashiba outcomes.

### U. Scenario adoption envelope

**Inference, deliberately limited.** Under the measured bounded
PostgreSQL/AI-assisted condition, every arm has at least one successful first
and final primary observation. The scenario matrix therefore uses
`VIABLE-WITH-TRADEOFFS` only for measured bounded conditions and
`INSUFFICIENT-EVIDENCE` where controls are limited. It makes no overall winner
or active-adoption claim. See [ADOPTION_DECISION_MATRIX.md](./ADOPTION_DECISION_MATRIX.md).

## Architecture, safety, and operations

The dedicated architecture controls begin with frozen VSA and layered
baselines. They measure imposed movement, centralization, generated
directories, configuration, and native-pool/test reuse; they do not score a
preferred architecture. AF replicates 1 and 2 have durable observations. The
replicate-two records deliberately retain heterogeneous standard and
nonstandard paths, so neither replicate set supports an arm-level architecture
conclusion. See
[ARCHITECTURE_FITNESS.md](./ARCHITECTURE_FITNESS.md).

Safety authority is distributed. The runner, PostgreSQL, candidate logic,
tool/runtime, TypeScript, and review cover different failure modes. In
particular, the benchmark does not treat type-time detection as categorically
superior to a live PostgreSQL detection. See
[SAFETY_AUTHORITY.md](./SAFETY_AUTHORITY.md).

Q1 is an SQL/DB-centric task, not a general ORM ranking. Its source trace and
EXPLAIN requirements are described in [DEBUGGABILITY.md](./DEBUGGABILITY.md).
The open-ended X1 control is explicitly separate from the bounded primary
matrix. H-007 r2 supplies six audited terminal records; its pre-correction r1
records remain preserved but are not used as final X1 interpretations. See
[DYNAMIC_COMPOSITION.md](./DYNAMIC_COMPOSITION.md).

**Observed secondary controls.** E1 preserves one passing, bounded native-pg
removal observation for every arm; it does not normalize coupling or repair
cost. SD preserves source-unchanged schema mutations, including the retained
SD-A static-isolation false positive and its corrected H-007 rerun. Detection
stage is fixture-specific rather than a quality order. These controls do not
alter primary live status or treatment review.

## Adoption envelope

**Hypothesis, not a recommendation yet.** The completed primary evidence
motivates further examination of Current Ashiba for bounded, SQL-centric,
AI-assisted PostgreSQL applications that retain a native driver and make
application/live tests the final authority. It does not establish active
adoption guidance for migration-centric teams, multi-database portability,
open-ended report builders, or human-only workflows. The decision matrix
therefore marks incomplete scenarios as `INSUFFICIENT-EVIDENCE`; see
[ADOPTION_DECISION_MATRIX.md](./ADOPTION_DECISION_MATRIX.md).

## Treatment-fidelity caveat

**Observed.** The preserved final treatment review records `pass` for all
eight primary Prisma cells. The independent
[Prisma treatment adjudication](./PRISMA_TREATMENT_ADJUDICATION.md) supplies
three separate fields: live behavior, frozen treatment review, and final
Prisma workflow interpretation. Six cells are
`qualified-inline-contract`; two are `emitted-contract-plus-raw-SQL`; none is
`native-pg-bypass`. All are raw-SQL-dominant through the Prisma runtime API.

**Inference boundary.** A frozen fidelity `pass` therefore establishes the
specified Prisma runtime/boundary use, not the full Prisma 8 schema/contract
authoring and generated-client lifecycle. The report does not represent this
as an ordinary generated-client comparison or normalize raw-SQL proportion.

## Reproduction and limits

Start from [README.md](./README.md), verify the frozen packet, run reference
and negative controls, then execute a selected isolated cell. Reproduction
requires the pinned Node/PostgreSQL environment and specified external
artifacts. The benchmark preserves failures rather than replacing them, but
its small replicate count, model-specific behavior, Windows-host isolation
limit, incomplete secondary controls, and pre-scoring protocol corrections
are material limits. See [LIMITATIONS.md](./LIMITATIONS.md).
