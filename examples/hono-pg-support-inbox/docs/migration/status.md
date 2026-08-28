# Migration Status

This historical dogfooding application keeps its visible SQL and
application-owned PostgreSQL seam under `src/adapters/pg`.

## Current State

- Canonical SQL and deterministic binding metadata remain visible.
- Application-owned PostgreSQL and route integration tests own SQL logic proof.
- `ashiba model-gen --check` is the current binding freshness path.
- Optional `ashiba postgres-contract` covers PostgreSQL-derived parameter and
  result representation proof.

## Next Steps

- Wire `src/adapters/pg/pool.ts` from your application entry point and replace
  it if your connection policy differs.
- Keep SQL visible and reviewable.
