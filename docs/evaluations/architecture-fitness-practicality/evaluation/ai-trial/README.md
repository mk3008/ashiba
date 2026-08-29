# AI-native read-query trial

This throwaway evaluation fixture records an independent attempt to add a
realistic PostgreSQL read query using the current Ashiba path. It is not a
product example and is not wired into a package, workspace, build, or CI job.

## Goal

Add a read query with:

- four named parameters;
- one nullable filter (`status`);
- a customer/order join;
- multiple result columns; and
- deterministic pagination with `limit`.

The intended path is:

```text
canonical .sql
  -> model-gen-shaped generated binding metadata
  -> bindNamedParameters
  -> native pg pool.query(sql, values)
  -> application-owned row mapping and tests
```

The canonical SQL remains visible in `list-customer-orders.sql`. The binding
file is intentionally shaped like the generated modules already present in
the repository; it contains no application values. `application-path.ts`
shows the application boundary without opening a connection or requiring
credentials.

## Source patterns discovered

1. Canonical SQL is kept in a `.sql` file and uses meaningful `:name`
   parameters.
2. `model-gen` emits driver-specific bindings and a `sourceHash`; PostgreSQL
   uses indexed `$n` placeholders.
3. Runtime code calls `bindNamedParameters` and passes SQL and values as
   separate arguments to the native `pg` pool.
4. Pool/transaction lifecycle and result mapping are application-owned.
5. Generated modules are treated as read-only outputs and are refreshed after
   SQL changes.

## Verification

The static harness is deliberately dependency-free:

```text
node verify-shape.mjs
```

It checks the query shape, placeholder order, binding-name set, native-driver
call boundary, and absence of SQL interpolation. No database is started and
no credentials are read. A real application would additionally run
`ashiba model-gen ... --check`, focused tests, and its live PostgreSQL tests.

## Practical observations

- Files touched: 4 fixture files (SQL, generated metadata, application path,
  and the static harness), plus this record.
- New Ashiba-specific concepts: canonical SQL, generated binding metadata,
  `bindNamedParameters`, and `model-gen --check`.
- Application glue: parameter/result interfaces, a native pool call, and row
  mapping; transaction ownership is not involved for this read.
- The trial reaches a complete, reviewable path without a new framework or
  runtime parser. The remaining correctness proof belongs to application
  tests/live execution, not the static fixture.

## Outcome fields

The machine-readable result is in `results.json`. It records the commands,
initial correctness, retries, and the absence of live execution. Token and
credit telemetry were unavailable for this independent trial.
