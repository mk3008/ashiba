# AI-First Builder Mapper Core Reduction Implementation

## Starting point

- Starting `main`: `6e2f3ee35fd22fe80b55f78d992699324fec326b`
- Decision inputs: the model-generation, remaining-CLI, and SQL-resource ownership evaluations.

## Result

Ashiba now owns the named-parameter primitive only. The current path is:

```text
visible canonical SQL
  -> compileNamedParameters
  -> bindNamedParameters
  -> native driver
  -> application/live tests
```

Applications choose how SQL is supplied and may compile/cache it at module initialization, startup, or build integration. That choice is not an Ashiba framework.

## Repository metadata follow-up

This implementation does not mutate GitHub repository metadata. The recommended
repository description for a human-maintained metadata update is: `SQL-first
TypeScript tooling for safe application development with visible SQL and
deterministic named-parameter binding.`

## Removed product surface

- `@ashiba-ts/cli`, its bin, all command registration, and all command-specific helpers/tests.
- `model-gen`, committed binding artifacts, `sourceHash`, and freshness workflows.
- CLI-owned check/config/project-check/describe, lint, query uses, PostgreSQL contract, and SQL-resource snapshot/compare surfaces.
- Historical Support Inbox dogfood and its current CI lanes.

The removed generic analyses may be valuable as separately scoped tools. This implementation does not rehome or replace them.

## Kept surface

`@ashiba-ts/named-parameters` continues to provide deterministic named-parameter compilation and binding, including missing/unused rejection and PostgreSQL, mysql2, and MSSQL rendering.

## Invariants

- Values never become SQL syntax through Ashiba.
- Dynamic SQL syntax is application-owned and selected only from reviewed, source-controlled finite literals.
- Pooling, transactions, mapping, logging, migrations, deployment, and application architecture remain outside Ashiba.

See [CORE_SURFACE_AFTER.md](./CORE_SURFACE_AFTER.md), [CONSUMER_MIGRATION.md](./CONSUMER_MIGRATION.md), and `raw-results.json` for the reproducible completion record.
