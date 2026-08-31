# E1 treatment removal

- Removed dependencies: `@prisma/orm-postgres` and the Prisma CLI package.
- Added runtime dependency: `pg` `8.16.3`.
- Removed generated/configuration state: no Prisma schema, generated client, contract builder, or Prisma command remains.
- Replaced execution commands: Prisma raw-plan construction and transaction callbacks are replaced by direct `pg.Pool` queries and an explicit `BEGIN` / `COMMIT` / `ROLLBACK` transaction for `assign`.
- Kept visible SQL, parameter validation, returned data validation, the public `createApplication(runtime)` API, and the ordinary application tests.
