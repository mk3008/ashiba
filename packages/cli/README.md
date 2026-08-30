# @ashiba-ts/cli

Ashiba's development-time CLI for visible SQL. It is not in an application's
runtime execution path.

The baseline is:

```text
canonical SQL → deterministic binding metadata → separate values → native driver
```

Use `ashiba model-gen <sqlFile> --out <file>` to generate metadata and add
`--check` to fail closed when the artifact is stale. Use
`ashiba postgres-contract` only when an optional PostgreSQL-derived
parameter/result proof is useful. Application-owned code calls the native
driver and owns transactions, rollback, and TypeScript types.

Discover every current command and its descriptor with:

```bash
ashiba describe command --format json
```

The CLI does not scaffold feature architecture or generate DTOs, mappers, or
mapper tests. Application architecture remains application-owned.
