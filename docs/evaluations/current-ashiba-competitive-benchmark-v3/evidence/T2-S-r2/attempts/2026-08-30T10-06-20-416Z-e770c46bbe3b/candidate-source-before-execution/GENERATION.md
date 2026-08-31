# sqlc generation provenance

The main database path is generated from `queries/claim.sql` and a temporary
projection of the `work_items` declaration from the supplied frozen packet
schema at `../packet/schema.sql`. The temporary input is deleted after
generation; the candidate contains no DDL or migrations.

Generation command (from this directory):

```powershell
node scripts/generate-sqlc.mjs
```

The script creates the ignored temporary schema, invokes
`docker run --rm -v "${PWD}:/src" -w /src sqlc/sqlc:1.31.1 generate`, and
removes the temporary schema even if generation fails. The resulting TypeScript
query module is committed in `src/generated/` and is imported directly by
`src/application.ts`.
