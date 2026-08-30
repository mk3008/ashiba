---
title: Runtime Boundary
---

# Runtime Boundary

Ashiba does not prescribe application architecture or own execution. The
canonical `.sql` file is the source of truth; application code controls how it
is loaded and compiled.

```text
canonical SQL
  → compileNamedParameters at a controlled initialization/build point
  → bindNamedParameters
  → native driver query(sql, values)
```

`compileNamedParameters` lowers named SQL into a prepared representation.
`bindNamedParameters` validates that representation and produces the separate
value array; it neither parses nor rewrites SQL at runtime. Missing and unused
parameters fail before the native driver call. Lowering never interpolates,
quotes, escapes, or substitutes application values into SQL text.

The application owns its pool, client, transaction, commit/rollback,
TypeScript types, business semantics, migration application, and live tests.
It may choose how SQL is bundled or loaded at runtime.

## Application integration

Applications own native-driver integration, including pools, transactions,
logging, retry policy, optional filters, and finite reviewed sort mappings.
External input must never become SQL syntax directly. A closed, validated input
set may select source-controlled, reviewed SQL literals (such as a bounded sort
term); that finite composition is distinct from interpolating raw request text.
PostgreSQL is the primary evidence lane; MySQL and SQL Server remain supported
secondary runtime targets.

## Application-owned integration

Applications may load canonical SQL from files, embed it, or bundle it through
ordinary application tooling. They may compile once and cache the prepared
representation. Ashiba does not own generated binding modules, source hashes,
freshness commands, feature layouts, DTOs, mappers, mapper tests, or an
application transaction abstraction.
