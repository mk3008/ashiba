# Consumer and Dependency Graph

```text
canonical .sql
  -> CLI model-gen
       -> named-parameter compiler / binding metadata / source hash
       -> optional query analysis (safe-sort and optional coordinates)
       -> optional PostgreSQL contract
  -> application query source
       -> preparePostgresQuery (current residual package)
            -> source/profile checks
            -> optional coordinate transform
            -> named binder
            -> optional safe-sort splice
       -> application-owned native pg.query(sql, values)
       -> application logging, transactions, semantic/live tests

standalone postgres-contract -> contract source/profile freshness
```

## Observed import edges

* `examples/hono-pg-support-inbox/src/adapters/pg/pool.ts` imports
  `preparePostgresQuery` and calls its own `queryable.query`.
* Support Inbox imports core types only for its application-local feature query
  interface.
* `dogfood/transfer` has equivalent imports but is detached experimental
  tooling and does not prove current Ashiba package retention.
* `model-gen` imports the named compiler and independently creates result,
  safe-sort, optional-coordinate, and binding artifacts. It does not import
  either adapter package.
* standalone contract commands live in the CLI; they do not call the pg
  preparation package.

## Consequences

The package boundary is not the dependency boundary. Named binding is already a
separate core. Build-time metadata is produced by the CLI. Contract checking is
already standalone. The broad runtime package currently combines these facts
with two optional transformations, so it cannot be retained simply because a
single application imports it.

The correct dependency direction remains:

```text
Ashiba deterministic preparation -> application-owned native pg execution
```

not a return to an Ashiba execution wrapper.
