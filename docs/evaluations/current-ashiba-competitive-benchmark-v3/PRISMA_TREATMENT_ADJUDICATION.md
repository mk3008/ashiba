# Prisma 8 RC treatment-fidelity adjudication

## Purpose and method

This is an independent final-publication interpretation layer over the frozen
per-cell `treatment-review.json` records. It does not rewrite a candidate,
the frozen arm treatment, or the recorded live PostgreSQL result. It answers a
narrower question: what Prisma 8 RC workflow did each preserved candidate
actually exercise?

The source review covered all eight primary Prisma snapshots and compared them
with the frozen requirement in [ARM_TREATMENTS.md](./ARM_TREATMENTS.md): a
Prisma schema/contract plus Prisma data-access boundary, with recorded raw-SQL
escape-hatch use. A `pass` below means boundary compliance under that frozen,
permissive schema/contract language; it does not claim that the complete Prisma
schema/code-generation lifecycle was exercised.

## Observed per-cell evidence

| Cell | Prisma runtime boundary | Main query path | Contract evidence | Frozen review | Final interpretation |
| --- | --- | --- | --- | --- | --- |
| G1-P-r1 | `@prisma/orm-postgres/runtime` | `db.raw.sql(...)` dominant | inline `defineContract` | pass | qualified-inline-contract |
| G1-P-r2 | Prisma runtime | `client.raw.sql(...)` dominant | inline `defineContract` | pass | qualified-inline-contract |
| T1-P-r1 | Prisma runtime | three raw SQL plans | inline `defineContract` | pass | qualified-inline-contract |
| T1-P-r2 | Prisma runtime | three raw SQL plans | emitted `contract.prisma/json/d.ts` | pass | pass; emitted-contract-plus-raw-SQL |
| T2-P-r1 | Prisma runtime | raw SQL claim plan | inline `defineContract` | pass | qualified-inline-contract |
| T2-P-r2 | Prisma runtime | raw SQL claim plan | emitted `contract.prisma/json/d.ts` | pass | pass; emitted-contract-plus-raw-SQL |
| Q1-P-r1 | Prisma runtime | raw SQL and EXPLAIN | inline `defineContract` | pass | qualified-inline-contract |
| Q1-P-r2 | Prisma runtime | raw SQL and EXPLAIN | inline `defineContract` | pass | qualified-inline-contract |

All eight candidates declared the Prisma 8 RC runtime and contract packages;
none imported or substituted native `pg`. All used a Prisma runtime transaction
boundary where the workload required one. Thus this is not a native-driver
bypass finding.

## Interpretation boundary

**Observed:** all cells were raw-SQL-dominant through Prisma's runtime API.
Two cells retained emitted contract artifacts; six retained only inline
`defineContract` evidence. The Q1 raw-SQL design is explicit in the candidate
plan and is appropriate to that DB-centric workload.

**Inference:** the frozen `pass` records establish Prisma runtime/boundary use
under the original treatment rule. They are insufficient to establish that all
eight cells represent the full Prisma 8 schema/contract authoring and emitted
artifact lifecycle. Publication text must therefore avoid that stronger claim.

**Not established:** whether an application using the normal generated Prisma
client workflow would have different first-pass behavior, repair burden,
schema-drift timing, or architecture effects under these workloads.

## Reporting rule

Result tables must retain three separate fields:

```text
live_behavior
frozen_treatment_review
final_prisma_workflow_interpretation
```

The final interpretation vocabulary is `qualified-inline-contract`,
`emitted-contract-plus-raw-SQL`, `native-pg-bypass`, or `unknown`. It must not
be folded into live behavior or used to alter historical first-pass/repair
records.
