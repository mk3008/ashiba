# sqlc generation provenance

The main data-access path is generated from `sql/transfer.sql` and
`sql/schema.sql`; `src/application.ts` calls those generated functions with a
native `pg` `PoolClient` transaction.

Generator: `sqlc` Docker image `sqlc/sqlc:1.31.1`.

Executed from this candidate directory:

```powershell
docker run --rm -v "${PWD}:/src" -w /src sqlc/sqlc:1.31.1 generate
```

The command completed successfully with no output. The TypeScript plugin and
its pinned SHA-256 are recorded in `sqlc.yaml`. Generated output:
`src/generated/transfer_sql.ts`.
