# Executive summary

## Scope

This is a descriptive benchmark of six frozen TypeScript/PostgreSQL
data-access treatments: Current Ashiba (`A`), Prisma 8 RC (`P`), sqlc (`S`),
Drizzle (`D`), Kysely (`K`), and native `pg` (`G`). It is not an overall
ranking, a performance contest, or a claim about all versions or uses of any
product.

**Observed.** The durable result index (schema v2) currently contains 48
primary cells (four workloads, six arms, two independent replicates), 67
preserved primary attempts, 48 canonical secondary cells, 32 standard runner
observations, 23 supplemental nonstandard AF runner observations, and 13
durable E1/SD schema documents. The primary runner records 37 final live
passes and 11 final live failures; direct first-attempt oracle/live records
are 34 passes and 14 failures. These descriptive counts are not pooled into a
winner or a superiority claim. Secondary controls are observation-only and are
not used to make adoption recommendations.

## What the evidence supports so far

**Observed.** Current Ashiba is exercised as a small raw-SQL harness: visible
SQL, `compileNamedParameters`, `bindNamedParameters`, and native `pg`. Its
successful cells demonstrate that this path can satisfy the frozen bounded
G1, transaction T1, concurrent-claim T2, and SQL/EXPLAIN Q1 runner contracts
under the measured conditions.

**Observed.** Every treatment has successful primary observations. Five arms
also have at least one recorded final live failure; Drizzle has eight recorded
primary final-live passes. These are cell counts, not a ranking or a causal
claim. The current evidence does not support an ``overall winner'' claim, nor
does it support treating a single final failure as a product-wide failure.

**Inference, deliberately limited.** The primary matrix is consistent with
the proposition that a small SQL-native treatment is viable for bounded
AI-assisted PostgreSQL work. It does not establish that Ashiba is preferable
to native `pg`, an ORM, a query builder, or sqlc in a different application,
team, database, or model setting.

The complete first/final per-arm matrix is A 4/5, P 6/6, S 3/4, D 8/8,
K 6/7, and G 7/7 (P counts out of eight). The direct first-oracle alias and
source path are retained per cell; later candidate attempt records are not
converted into causal repair or orchestration-retry claims.

## Publication status

The primary execution evidence, corrected SD/E1 durable observations, and
completed AF replicate-two path preservation are reviewable. AF is reported
by path rather than made into a normalized score. X1 H-007 r2 supplies six
explicit terminal records; r1 remains preserved correction context. The
publication record still requires independent audit, repository verification,
and remote CI confirmation. See [limitations](./LIMITATIONS.md) and the
[correction ledger](./EXCLUSION_AND_CORRECTION_LEDGER.md).
