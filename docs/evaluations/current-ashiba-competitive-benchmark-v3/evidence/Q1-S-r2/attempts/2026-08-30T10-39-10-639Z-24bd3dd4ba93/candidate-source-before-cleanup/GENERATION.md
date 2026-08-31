# sqlc generation record

The application query path is generated from `sqlc/schema.sql` and
`sqlc/query.sql` into `src/generated/query_sql.ts`.

Generation command:

```powershell
sqlc generate -f sqlc.yaml
```

Generation target: sqlc 1.31.1 with `sqlc-gen-typescript` 0.1.3, PostgreSQL,
Node runtime, and the `pg` driver.

The cell image did not provide a `sqlc` executable, so this initial candidate
contains the recorded generated TypeScript output and configuration; regeneration
could not be executed locally.
