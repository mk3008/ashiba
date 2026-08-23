# Scope reference backend

A deliberately small source-code reference for the canonical
[Ashiba Scope](../../docs/design/ashiba-scope.md). Start with
`CHALLENGE.md`, then read `src/tickets/list.sql`, `src/tickets/list.ts`,
`src/tickets/ordering.ts`, `src/tickets/assign.ts`, `src/db.ts`, and the
integration test.

This is an implementation choice for this reference, not an Ashiba
architectural requirement. It uses shallow vertical slices, visible SQL, and
native `pg` Pool/PoolClient ownership; it has no repository, unit-of-work, or
generic mapper layer.

`pnpm --filter scope-reference-backend test` runs PostgreSQL integration tests
when `DATABASE_URL` is set. `docker compose up -d` starts the local database.
