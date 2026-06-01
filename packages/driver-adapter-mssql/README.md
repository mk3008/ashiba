# @ashiba-ts/driver-adapter-mssql

Thin Ashiba adapter for `mssql` queryables.

This package is wrapper-specific: it targets the `mssql` driver, not every
possible SQL Server client.

This is an Ashiba driver adapter package. It is not an ORM and is not the full
Ashiba developer workflow by itself. Use it with `@ashiba-ts/cli` generated
query contracts and project checks.

Start with the repository README for the full SQL-first workflow:

- [Ashiba README](https://github.com/mk3008/ashiba#readme)
- [Command API](https://mk3008.github.io/ashiba/generated/api/commands)

## Current Scope

The SQL Server adapter exists for driver integration, but the PostgreSQL path is
the most complete Ashiba starter and testkit path today. Treat SQL Server usage
as an adapter-level path that may require more project-specific wiring than the
PostgreSQL starter.
