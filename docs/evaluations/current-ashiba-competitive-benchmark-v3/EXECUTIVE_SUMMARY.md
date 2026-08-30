# Executive summary

## Scope

This is a descriptive benchmark of six frozen TypeScript/PostgreSQL
data-access treatments: Current Ashiba (`A`), Prisma 8 RC (`P`), sqlc (`S`),
Drizzle (`D`), Kysely (`K`), and native `pg` (`G`). It is not an overall
ranking, a performance contest, or a claim about all versions or uses of any
product.

**Observed.** The durable result index (schema v2) currently contains 48
primary cells (four workloads, six arms, two independent replicates), 67
preserved primary attempts, 42 canonical secondary cells, 29 standard runner
observations, 22 supplemental nonstandard AF runner observations, and 13
durable E1/SD schema documents. The primary runner records 37 final live
passes and 11 final live failures. These descriptive counts are not pooled into
a winner or a superiority claim. Secondary controls are observation-only and
are not used to make adoption recommendations.

## What the evidence supports so far

**Observed.** Current Ashiba is exercised as a small raw-SQL harness: visible
SQL, `compileNamedParameters`, `bindNamedParameters`, and native `pg`. Its
successful cells demonstrate that this path can satisfy the frozen bounded
G1, transaction T1, concurrent-claim T2, and SQL/EXPLAIN Q1 runner contracts
under the measured conditions.

**Observed.** Every other treatment also has successful primary observations.
Every arm also has at least one recorded final live failure in one or more
primary cells. Therefore the current evidence does not support an
``overall winner'' claim, nor does it support treating a single final failure
as a product-wide failure.

**Inference, deliberately limited.** The primary matrix is consistent with
the proposition that a small SQL-native treatment is viable for bounded
AI-assisted PostgreSQL work. It does not establish that Ashiba is preferable
to native `pg`, an ORM, a query builder, or sqlc in a different application,
team, database, or model setting.

## Publication status

The primary execution evidence and corrected SD/E1 durable observations are
preserved and reviewable. AF replicate-two evidence is retained but
heterogeneous, so it is reported by path rather than made into a normalized
score. The publication record still requires independent audit, repository
verification, and remote CI confirmation. See [limitations](./LIMITATIONS.md)
and the [correction ledger](./EXCLUSION_AND_CORRECTION_LEDGER.md).
