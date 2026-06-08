# Migration Status

This starter was created by `ashiba init`.

## Current State

- Visible SQL starter exists.
- Demo DDL is optional. Re-run `ashiba init --db postgres --driver pg --with-demo-ddl --force` if you want the tutorial DDL files.
- Feature/query boundaries are created by explicit `ashiba feature scaffold` commands.
- Mapper and traditional test lanes are available for scaffolded features.
- Query-local generated test plan files are created with scaffolded query boundaries and are library-owned.
- ZTD mapper cases share one pg Pool per query test file; traditional/performance tests should keep their own physical-state lifecycle.
- A small application-owned `pg` Pool/transaction seam exists under `src/adapters/pg`.

## Next Steps

- Wire `src/adapters/pg/pool.ts` from your application entry point and replace it if your connection policy differs.
- Replace starter sample cases with project-specific mapper and feature cases when the query contract is ready.
- Run `ashiba feature tests check` to inspect generated mapper coverage and drift.
- Keep SQL visible and reviewable.
