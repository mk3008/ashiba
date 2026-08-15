---
title: Schema compatibility and SQL resource portability comparison
---

# Schema compatibility and SQL resource portability comparison

This record separates observed facts, interpretation, and unverified limits.
It does not claim that Ashiba replaces Drizzle or Kysely. The products solve
overlapping application-query problems through different ownership models.

## Versioned experiment

The 2026-08-14 disposable PostgreSQL 18 experiment used the then-current npm
versions Drizzle 0.45.2 and Kysely 0.29.5, plus node-postgres 8.21.0 and
TypeScript 5.9.3. The comparison project was installed outside the workspace so
these packages did not become Ashiba runtime or development dependencies.

Official documentation supports the tested public surfaces:

- Drizzle documents database-first schema introspection through
  [`drizzle-kit pull`](https://orm.drizzle.team/docs/drizzle-kit-pull), query
  conversion to SQL/parameters, and that a declared
  [`sql<T>` type is only a developer-provided helper](https://orm.drizzle.team/docs/sql).
- Kysely documents that builders and raw expressions produce a
  [`CompiledQuery`](https://kysely-org.github.io/kysely-apidoc/interfaces/Compilable.html)
  and that raw SQL result types are supplied through the generic
  [`sql<T>` interface](https://kysely-org.github.io/kysely-apidoc/interfaces/Sql.html).

### Observed facts

One TypeScript source declared the same PostgreSQL tables through a Drizzle
schema and a Kysely database interface. Before mutation, both returned the same
rows. `tsc --noEmit` passed.

Database DDL then changed while the TypeScript source remained unchanged:

| Database mutation | Unchanged Drizzle/Kysely build | Unchanged runtime |
|---|---|---|
| `nickname` renamed to `display_name` | Passed; build did not connect to PostgreSQL | Both failed when the old column query executed. |
| `text NOT NULL` became nullable and a `NULL` row was stored | Passed | Both returned `null` while their stale static result type remained `string`. |
| `integer` became `bigint` and stored `9007199254740993` | Passed | Kysely/node-postgres returned a string while its stale interface said `number`; Drizzle's stale integer decoder returned the rounded number `9007199254740992`. |
| `count(*)` selected with `sql<number>` | Passed | Both values were node-postgres strings, despite the declared number generic. |

After the Drizzle schema and Kysely database interface were updated, stale
`nickname` property/selection access was rejected by TypeScript. The fixture
kept `@ts-expect-error` assertions, so its successful typecheck also verifies
that this compiler feedback remains present.

Both builders emitted ordinary PostgreSQL SQL and ordered parameters through
Drizzle `toSQL()` and Kysely `compile()`. Therefore builder queries are not
opaque and can be sent to SQL tools after compilation.

### Ashiba live matrix facts

Ashiba evaluated 21 canonical SQL resources against before/after PostgreSQL 18
schemas while every canonical source hash remained unchanged:

| Classification | Count | Mutations observed |
|---|---:|---|
| `unaffected` | 1 | Unchanged external-consumer query. |
| `compatible` | 5 | `smallint` to `integer`, nullable to `NOT NULL`, explicit parameter cast, array element widening, enum append. |
| `contract-changed` | 8 | `integer` to `bigint`, `NOT NULL` to nullable, aggregate result change, function return change, inferred parameter type change, integer-to-UUID parameter change, enum value rename, JSON to JSONB identity. |
| `execution-breaking` | 5 | Column rename/drop and referenced table/view/function disappearance. |
| `needs-review` | 2 | Inner-to-left-join view definition change and domain constraint change. |

The snapshot path prepared statements but did not execute application queries.
A separate JavaScript consumer imported only `pg`, read resource JSON and its
separate generated SQL, ordered values from metadata, executed the query,
checked result names/runtime values, and ran `EXPLAIN (FORMAT JSON)`.

A deterministic 100-query synthetic fleet with five changed queries reported
5 affected resources, 10,000 canonical SQL bytes, 500 affected bytes, and 95%
of source bytes avoided. This is a cost-model test, not a measured LLM token
benchmark.

## Interpretation

### Schema-change compatibility

Drizzle and Kysely are stronger in the normal edit loop after their schema
declaration or generated database types have been updated: property-level
compiler errors are immediate, local, and do not require a live database.
Their typed builders also make arbitrary runtime composition substantially more
natural than Ashiba's deliberately subtractive runtime model.

The unchanged-source experiment establishes a different boundary. TypeScript
compilation alone did not observe database-only drift. A Drizzle database-first
team can run `drizzle-kit pull`, inspect generated schema changes, and then use
compiler feedback. Kysely teams can likewise regenerate or update their
database interface using their chosen code generator. Those are valid and often
excellent workflows, but the generator/schema refresh is the step that imports
database reality into TypeScript.

Ashiba compares the real database directly with every real SQL statement. It
can distinguish "PostgreSQL cannot prepare this" from "it prepares, but the
parameter/result/driver contract changed" without first translating the schema
or query into TypeScript. This is most valuable when SQL is shared across
languages, contains substantial PostgreSQL-specific or raw expressions, or
must be audited as a fleet independently of one application build.

The advantage is not universal. Ashiba requires disposable before/after
databases or equivalent snapshots, has a slower feedback loop, and reports
semantic uncertainty instead of a false proof for domain constraints, view
logic, and general result nullability. It does not provide Drizzle/Kysely's
typed arbitrary builder composition.

### SQL resource portability

All three paths can ultimately produce SQL plus parameters. The difference is
which artifact is durable and authoritative:

| Question | Ashiba | Drizzle | Kysely |
|---|---|---|---|
| Authored query source | Standalone `.sql`. | TypeScript builder or embedded `sql` template. | TypeScript builder or embedded `sql` template. |
| External SQL without application build | Read the canonical/derived SQL file and JSON. | Persist output from `toSQL()` or separately maintain raw SQL. | Persist output from `compile()` or separately maintain raw SQL. |
| Debug/tune return path | Edit the same canonical `.sql`, then regenerate evidence. | Translate the tuned SQL back into builder/template source or choose SQL as a separate source. | Translate the tuned SQL back into builder/template source or choose SQL as a separate source. |
| Dynamic composition | Finite generated capabilities and subtraction only. | Strong typed builder composition. | Strong typed builder composition. |

Compiled Drizzle/Kysely SQL is fully usable for a one-off EXPLAIN. What is not
automatic is round-trip ownership: an edited compiled statement does not update
the builder. Teams can solve this by storing raw `.sql` beside either library,
but at that point the relevant comparison is Ashiba's database-derived
resource/check tooling versus that raw-SQL-plus-tooling workflow, not Raw SQL
versus the builder in the abstract.

## Known false-positive and false-negative boundaries

- Enum appends are classified compatible because old inputs/results remain
  representable, even though application exhaustive switches may need review.
- Driver-equivalent database type changes can be compatible while validation,
  range, precision, collation, index use, or performance changes; those facts
  remain outside this contract.
- View definition and domain constraint changes intentionally produce
  `needs-review`, which includes safe changes (false positives for human work)
  rather than pretending semantic equivalence.
- General output nullability remains inferred/unknown. Referenced-column
  `NOT NULL` drift is detected, but arbitrary expression/JOIN nullability cannot
  always be mechanically reduced to the output column (possible false
  negatives).
- Custom driver parsers are opaque. A custom profile produces unknown driver
  representations unless an application-owned stable profile is supplied.
- Drizzle/Kysely results depend on schema/interface freshness. With a reliable
  introspection/codegen gate they can detect more application source errors
  than the unchanged-source experiment alone.

## Unverified hypotheses

- The 95% source reduction should reduce LLM context and investigation time,
  but no LLM benchmark was run in this phase.
- Large fleets may expose PostgreSQL catalog-lock or connection-startup costs;
  the current implementation describes queries sequentially and has not been
  load-tested at thousands of queries.
- Compatibility rules will need versioning as more driver profiles and
  PostgreSQL extension types are supported.
