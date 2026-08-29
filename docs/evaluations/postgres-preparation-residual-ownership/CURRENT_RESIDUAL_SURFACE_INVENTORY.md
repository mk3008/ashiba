# Current Residual Surface Inventory

## Packages

| Package | Public state | Current role after Phase 2 | Source / tests |
| --- | --- | --- | --- |
| `@ashiba-ts/driver-adapter-pg` | public `0.1.1`, optional `pg` peer | `preparePostgresQuery`; no client acquisition or execution | `src/index.ts` (840 lines); 3 preparation tests; 1 live-smoke test |
| `@ashiba-ts/driver-adapter-core` | public `0.1.0` | query-model and PostgreSQL contract types; safe-sort renderer/error | `src/index.ts` (478 lines); 2 safe-sort tests |

Line counts are inventory only, not a decision score.

## Exported residual responsibilities

`driver-adapter-pg` exports preparation options, query-source/query-model
types, prepared-query data, decorated parameter/query-model errors, and
`preparePostgresQuery`. The function:

1. checks a contract driver profile;
2. checks source hashes for query model, PostgreSQL binding, and optional
   contract;
3. optionally performs coordinate-based optional-condition subtraction;
4. binds generated indexed SQL through the named-parameter core;
5. optionally renders/splices safe sort; and
6. returns SQL and ordered values.

`driver-adapter-core` exports sort types/rendering, query-model/type-only
contracts, dialect binding metadata contracts, and PostgreSQL contract types.
It no longer exports execution observer, masking, retry, cardinality, or
feature-executor APIs.

## Generated-artifact coupling

`model-gen` generates source hash and dialect binding metadata. Query analysis
can additionally emit safe-sort and optional-condition coordinate facts.
`postgres-contract` and `standalone-postgres-contract` own optional database
contract generation/checking. These are distinct reasons for source hashes and
metadata to exist; they are not evidence that the pg preparation package must
own them.

## Current consumers

| Consumer class | Current consumer | Classification |
| --- | --- | --- |
| current reference application | `examples/hono-pg-support-inbox` | current product/dogfood evidence |
| detached experimental product | `dogfood/transfer` | not current Ashiba retain evidence |
| direct package tests | both packages | test-only |
| root PostgreSQL live lane | pg package smoke + CLI SQL-resource live tests | verification, not an application package owner |
| guide | `docs/guide/sssql.md` | current documentation of optional compression |

No MySQL or SQL Server adapter is part of this residual surface. Their removal
does not change supported-secondary DBMS positioning.

## Current tests and CI

The pg preparation tests cover hostile-value separation, missing/unused
parameter rejection, stale source metadata rejection, and compression output.
The core tests cover finite safe-sort rendering and hostile/unknown input
rejection. Phase 2 recorded a passing native pg live preparation test and
Support Inbox DB-backed proof. No new execution behavior was introduced here.
