# @ashiba/ddl-pull-pg-dump

PostgreSQL DDL pull helpers backed by `pg_dump` for Ashiba.

This package is intentionally separate from `@ashiba/driver-adapter-pg` because PostgreSQL DDL pull depends on external DBMS tooling such as `pg_dump`, not on a TypeScript database driver contract.

The package name is deliberately `@ashiba/ddl-pull-pg-dump`: `ddl-pull` names the Ashiba capability and `pg-dump` names the wrapped executable. A generic DDL pull package would need to own equivalent pull behavior for PostgreSQL, MySQL, SQL Server, and other supported database families. This package only wraps explicit PostgreSQL `pg_dump` usage.

It exposes:

- `buildPgDumpArgs` and `createPgDumpCommand` for schema-only `pg_dump` execution.
- `createPgDumpCommandPreview` for logging or AI-facing diagnostics without leaking passwords embedded in PostgreSQL connection URLs.
- `pullPostgresDdl` for callers that explicitly choose to run `pg_dump`.
