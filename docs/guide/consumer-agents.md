# Copyable consumer AGENTS.md

Ashiba does not generate, install, or enforce agent behavior files. The sample
below is documentation you may copy into an application repository.

```md
# Ashiba application invariants

- Treat the existing DDL as the database contract.
- Keep canonical SQL visible in `.sql` files.
- Use meaningful named parameters for application values.
- In PostgreSQL nullable guards, make the parameter type explicit when its
  `NULL` use would otherwise be ambiguous (for example
  `cast(:status as text) is null`).
- Compile canonical SQL with `compileNamedParameters` at a controlled
  initialization or build point, then cache the prepared result.
- Bind with `bindNamedParameters`, then call the native driver directly.
- Pools, transactions, logging, result mapping, migration, and deployment are application or external-tool responsibilities.
- Never interpolate external input into SQL syntax. Dynamic SQL may use only a closed, reviewed, source-controlled literal set.
- Prove SQL behavior with application and live tests.
```

This is deliberately an invariant list, not a command recipe or a replacement
for application architecture decisions.
