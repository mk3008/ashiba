---
title: PostgreSQL Contract and Query Builder Comparison
---

# PostgreSQL Contract and Query Builder Comparison

This record captures a 2026-08-14 PostgreSQL 18 experiment. It is comparative
evidence, not a claim that Ashiba replaces an ORM or a general query builder.
The disposable fixture pinned Drizzle 0.45.2, Kysely 0.29.5, node-postgres
8.21.0, and TypeScript 5.9.3.

## Method

All three implementations used the same schema, three rows, and PostgreSQL
connection. The dynamic-search requirement combined an optional status filter,
an integer-array membership condition, a hostile string parameter, pagination,
and a two-key finite sort allowlist. Ashiba compiled canonical SQL with its
existing subtractive optional-condition and safe-sort paths. Drizzle and Kysely
used their normal typed builders.

The complex query combined a CTE, window function, aggregate `FILTER`, JSONB,
arrays, `CASE`, a PostgreSQL built-in function, and PostgreSQL-specific syntax.
The exact canonical SQL text was used through Ashiba and through the raw-SQL
escape hatches of Drizzle and Kysely. A separate compile-time fixture checked
ordinary projection, nullability, schema rename detection, and deliberately
false raw-expression generics.

## Observations

| Observation | Ashiba | Drizzle | Kysely |
|---|---|---|---|
| Dynamic-search rows | Same two rows | Same two rows | Same two rows |
| Hostile value absent from SQL text | Yes | Yes | Yes |
| Invalid sort key rejected by finite map | Yes | Yes | Yes |
| Complex-query rows | Same two rows | Same two rows | Same two rows |
| Ordinary projection/nullability inference | Generated contract check | Inferred from schema | Inferred from database interface |
| Complex raw `count` static claim | PostgreSQL-derived `string` | Developer may write `sql<number>` | Developer may write `sql<number>` |
| Deliberately false raw claim | Normal mapper check rejected it | Compiled; runtime value was `string` | Compiled; runtime value was `string` |
| Canonical standalone SQL | Retained | Builder for search; raw text for complex query | Builder for search; raw text for complex query |

The complex query's database result types included `text`, `bigint`, and
`jsonb`. node-postgres returned strings for `bigint` and parsed JSON values.
Ashiba retained JSON as TypeScript `unknown`, because the database type and
driver parsing do not prove an application object shape.

The `FOR UPDATE SKIP LOCKED` fixture also demonstrated parser degradation:
Ashiba blocked parser-dependent safe-sort work while leaving SQL storage,
parameter binding, and ordinary PostgreSQL execution available. Real locking
semantics were verified separately with two live transactions.

## Interpretation

For normal typed builder paths, Drizzle and Kysely provide stronger interactive
composition and shorter feedback without requiring a development database.
Ashiba's comparable guarantee depends on generated/check gates, and its
PostgreSQL-derived enrichment requires an optional development database.

For complex SQL that is represented as a developer-typed raw expression,
Ashiba's database-derived OID and driver-representation evidence rejected a
wrong self-report that both tested raw generic APIs accepted. This is a scoped
advantage at the raw-expression boundary, not a general claim over Drizzle or
Kysely. Builders remain the better fit when arbitrary runtime joins,
projections, predicates, or reusable typed query fragments are product
requirements.

The executable comparison fixture remained supplementary so Drizzle and Kysely
did not become Ashiba workspace dependencies. The repository live tests retain
the PostgreSQL contract, driver-value, mutation-non-execution, locking, and SQL
interoperability assertions that gate Ashiba itself.
