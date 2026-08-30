# Arm treatments and input policy

All scored runs use the same Fresh-Agent model profile, permissions, timebox,
PostgreSQL fixture, and runner public API. The raw run ledger, rather than this
plan, records the actual model/effort and timestamps. An arm may read installed
official package README/docs and current arm-appropriate guidance; it may not
read another arm's source, previous candidate source/output, or benchmark
archive results.

| Arm | Required evidence for treatment-fidelity pass | Permitted escape hatch | Disallowed bypass |
| --- | --- | --- | --- |
| A | visible canonical SQL, direct compiler/binder use, native `pg` | reviewed finite application literals for SQL syntax | ORM/query builder replacing primary data path |
| P | Prisma schema/contract plus Prisma data-access boundary | documented Prisma raw-SQL API, recorded with reason | native `pg` replacing main Prisma path |
| S | `sqlc generate` and generated TS query calls | normal generated transaction/driver integration | direct `pg` without generated query path |
| D | Drizzle query/SQL API and Drizzle transaction path | Drizzle `sql` composition | direct `pg` replacing Drizzle path |
| K | Kysely query/SQL API and Kysely transaction path | Kysely `sql` composition | direct `pg` replacing Kysely path |
| G | native `pg` only | visible parameterized SQL | ORM, query builder, sqlc, or Ashiba |

Treatment review has three outcomes: `pass`, `fail`, or `unknown`. It is
secondary to live behaviour and is never reconstructed from a successful
candidate after the fact.
