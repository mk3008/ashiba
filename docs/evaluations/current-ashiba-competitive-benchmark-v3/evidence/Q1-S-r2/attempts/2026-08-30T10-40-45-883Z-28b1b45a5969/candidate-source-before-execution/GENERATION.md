# sqlc generation record

The application query path is generated from the supplied packet schema
(`../packet/schema.sql`) and `sqlc/query.sql` into `src/generated/query_sql.ts`.

Generation command:

```powershell
sqlc generate -f sqlc.yaml
```

Generation target: sqlc 1.31.1 with `sqlc-gen-typescript` 0.1.3, PostgreSQL,
Node runtime, and the `pg` driver.

The candidate intentionally owns no DDL. Schema definition remains in the
immutable sibling packet supplied to the cell.

The cell image did not provide a `sqlc` executable, so this initial candidate
contains the recorded generated TypeScript output and configuration; regeneration
could not be executed locally.
