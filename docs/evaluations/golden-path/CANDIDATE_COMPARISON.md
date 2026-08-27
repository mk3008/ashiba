# Candidate Comparison

| Candidate | Classification | Construction and change evidence | Durable maintenance surface |
| --- | --- | --- | --- |
| A: minimal/reference | **recommended** | Canonical ticket SQL, deterministic lowering, native `pg`, hostile-value separation, optional filters, nullable fields, bigint strings and app-owned rollback are implemented and tested in the reference. Real PostgreSQL 18 + `pg` typecheck/generated/live tests and four contract checks passed, including three negative controls. | SQL, lowered snapshot/binding metadata, manual types, application transaction/order code, selective contract and live tests. |
| B: README/scaffold-heavy | **supported-alternative** | Fresh packaged CLI successfully initialized, scaffolded/imported queries, refreshed metadata and diagnosed drift. It required several dependencies before init; it creates feature/boundary/DTO/mapper/ZTD/test-plan surfaces. | CLI/config, feature layout, generated query metadata, DTO/mapper contracts, ZTD/test assets, adapter seam, scaffold conventions. |
| C: packed-package discovery | **evaluation-only** | Tarballs exposed `init`, `feature`, and native `pg` structure. After dependency repair it generated visible SQL and `query.sql.ts`/`query.meta.ts`, but the starter failed `tsc --noEmit` and retained the default failing test script. | Same scaffold surface as B, plus package discovery/dependency knowledge and repair of starter scripts/types. |

## Fresh-run friction

- A: source/reference inspection found the smallest coherent path. The fresh run
  had no `node_modules`; its focused test was therefore unavailable. The main
  evaluation installed dependencies and used an explicit temporary Docker subnet
  after the default address pools were exhausted. It then passed typecheck,
  generated freshness, four live tests, four PostgreSQL contract checks and
  three negative controls.
- B: `init` first rejected missing PostgreSQL dependencies. After installation,
  scaffold/import/refresh/check commands succeeded. `check --full` could not
  start Vitest due a local `EPERM` under `.vite-temp`; no live database proof.
- C: packed tarballs installed successfully. `init` required additional dev
  dependencies, then succeeded. The generated starter failed typecheck in its
  pool adapter and did not replace npm's default test script.

## Responsibility leakage

Candidate A has no required repository, mapper, UoW, framework wrapper, SQL
file loader, or architecture layout. B/C introduce a feature boundary, DTO and
mapper concepts, generated test assets and adapter layout. All candidates keep
native-driver connection and transaction ownership with the application.
