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

All primary cells use Node 24.18.0, PostgreSQL 18.6, strict TypeScript, a
fresh candidate directory, a fresh agent session, a nonce database role and
schema, and a shared read-only runner/packet. Candidate repairs are capped at
two after the initial response. Parallel execution is throughput only; wall
time is not a comparative metric. Windows OS-user and network isolation were
not available, so database-role/schema isolation is not overstated as
full-process isolation.

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
| G1 | Bounded business application and maintenance request | 9 pass, 3 fail |
| T1 | Atomic debit/credit/audit transaction | 9 pass, 3 fail |
| T2 | Concurrent work claim | 10 pass, 2 fail |
| Q1 | Complex PostgreSQL query, trace, and EXPLAIN task | 9 pass, 3 fail |

Those counts are cell observations, not tool scores. The per-cell record,
including each final state, is in `raw-results.json`; first-pass command
slots and additional attempts are retained separately. The index intentionally
does not infer causal repair categories where the original schema did not
record them.

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
failures and successful observations for every comparison arm, but it is not
designed or powered to establish a universal loss or superiority result. The
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

## Architecture, safety, and operations

The dedicated architecture controls begin with frozen VSA and layered
baselines. They measure imposed movement, centralization, generated
directories, configuration, and native-pool/test reuse; they do not score a
preferred architecture. AF replicate 1 has durable observations; AF replicate
2 is pending, so no arm-level architecture conclusion is published. See
[ARCHITECTURE_FITNESS.md](./ARCHITECTURE_FITNESS.md).

Safety authority is distributed. The runner, PostgreSQL, candidate logic,
tool/runtime, TypeScript, and review cover different failure modes. In
particular, the benchmark does not treat type-time detection as categorically
superior to a live PostgreSQL detection. See
[SAFETY_AUTHORITY.md](./SAFETY_AUTHORITY.md).

Q1 is an SQL/DB-centric task, not a general ORM ranking. Its source trace and
EXPLAIN requirements are described in [DEBUGGABILITY.md](./DEBUGGABILITY.md).
The open-ended X1 control is explicitly separate from the bounded primary
matrix; see [DYNAMIC_COMPOSITION.md](./DYNAMIC_COMPOSITION.md).

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
eight primary Prisma cells. Several notes describe a Prisma 8 RC raw-SQL or
raw-plan main path. **Unadjudicated.** The review does not normalize raw-SQL
proportion or decide whether each raw-SQL-dominant candidate represents a
normal Prisma client/contract workflow. A recorded fidelity pass means only
what the frozen review recorded; it is not evidence that an ordinary
Prisma-client comparison was performed.

## Reproduction and limits

Start from [README.md](./README.md), verify the frozen packet, run reference
and negative controls, then execute a selected isolated cell. Reproduction
requires the pinned Node/PostgreSQL environment and specified external
artifacts. The benchmark preserves failures rather than replacing them, but
its small replicate count, model-specific behavior, Windows-host isolation
limit, incomplete secondary controls, and pre-scoring protocol corrections
are material limits. See [LIMITATIONS.md](./LIMITATIONS.md).
