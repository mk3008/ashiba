---
title: Runtime Boundary
---

# Runtime Boundary

Ashiba does not prescribe application architecture or own execution. The
canonical `.sql` file is the source of truth; the CLI is development-time
tooling only.

```text
canonical SQL
  → build-time named lowering and binding metadata
  → bindNamedParameters
  → native driver query(sql, values)
```

`@ashiba-ts/named-parameters/compiler` lowers named SQL at build time.
`bindNamedParameters` validates generated metadata and produces the separate
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

The standalone PostgreSQL contract is also optional. It describes canonical
SQL through real PostgreSQL without executing mutations and compares the
observed parameter/result representation with application-owned TypeScript
types.

## Generated artifacts

The current generated artifact is binding metadata, such as lowered driver SQL,
parameter names, and a source hash. Regenerate it from canonical SQL and use
`ashiba model-gen --check` to reject stale output. Ashiba does not generate
feature layouts, DTOs, mappers, mapper tests, or an application transaction
abstraction.
