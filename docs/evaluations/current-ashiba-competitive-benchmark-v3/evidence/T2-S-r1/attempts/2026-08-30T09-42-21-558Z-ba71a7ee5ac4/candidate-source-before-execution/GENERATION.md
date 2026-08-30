# sqlc generation provenance

The generated query module is created from `sql/schema.sql` and
`sql/queries.sql`; it is not hand-authored.

Generation command:

```powershell
docker run --rm -v "${PWD}:/src" -w /src sqlc/sqlc:1.31.1 generate
```

Expected generated file:

- `src/generated/queries_sql.ts`

The configuration pins the official sqlc TypeScript WASM plugin URL and SHA-256
from the supplied official documentation snapshot.
