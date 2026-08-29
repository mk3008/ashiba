# Driver Adapter Reduction Phase 2 Implementation

## Starting surface

At `259cbcb78c4ca2c777566cf746db1c81be544689`, the PostgreSQL package both
prepared deterministic SQL and called a supplied pg-compatible client. The
shared core also published observer/event/masking and feature-executor/cardinality
conveniences.

## Implemented boundary

Support Inbox now owns the final native call:

```text
canonical SQL
→ CLI-generated binding metadata
→ preparePostgresQuery
→ bindNamedParameters
→ application-owned pg.query(sql, values)
→ application/live tests
```

The application-owned pool module retains its own pool, transaction, logging,
and feature-executor wiring. It uses `preparePostgresQuery` only to obtain
bounded deterministic SQL and values, then directly invokes `pg`.

## Removed ordinary execution surface

- `createPostgresAdapter` and the adapter execution interface.
- pg-compatible query delegation types.
- execution observer/event/masking integration from the public core.
- PostgreSQL transient-error classification.
- shared feature-executor/cardinality helpers and their contract tests.
- wrapper-specific unit/live tests and deprecated compilation alias.

Support Inbox and the temporarily colocated Transfer application now own their
feature-executor/cardinality seams locally. This does not create a new Ashiba
framework; it removes an Ashiba-owned application architecture boundary.

## Retained deliberately

- `preparePostgresQuery` and deterministic named binding.
- metadata/source-hash validation used by preparation.
- optional-condition compression, including stale-coordinate rejection.
- safe-sort metadata and reviewed profile rendering.
- optional PostgreSQL contract profile validation.

Safe-sort and runtime source-hash final placement remain deferred. Optional
condition compression remains `KEEP OPTIONAL`; this phase does not decide its
productization. The standalone PostgreSQL contract remains adapter-external.

## DBMS and Scope

PostgreSQL remains PRIMARY; MySQL/mysql2 and SQL Server/mssql remain supported
secondary targets. Native drivers remain baseline execution owners. Scope and
the Golden Path are unchanged.

## Compatibility

This is a breaking removal of public ordinary PostgreSQL adapter APIs. There is
no forwarding wrapper or deprecated execution alias. Existing applications can
keep canonical SQL and binding metadata, call `preparePostgresQuery`, and invoke
their selected native pg client directly.

## Deferred

- final PostgreSQL package naming/placement;
- safe-sort ownership;
- runtime source-hash placement;
- optional-condition compression productization;
- any further core/package extraction.
