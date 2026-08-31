# sqlc generation provenance

The sqlc configuration uses the protocol-owned `../packet/schema.sql` and
candidate-owned `sql/queries.sql`; the generated query module is not
hand-authored. The candidate contains no DDL or migration files.

Generation command:

```powershell
docker run --rm -v "${PWD}:/src" -v "<resolved-protocol-schema-dir>:/packet:ro" -w /src sqlc/sqlc:1.31.1 generate
```

Expected generated file:

- `src/generated/queries_sql.ts`

The configuration pins the official sqlc TypeScript WASM plugin URL and SHA-256
from the supplied official documentation snapshot.

The frozen packet's schema has a runner-rendered `{{schema}}` placeholder.
Regeneration therefore occurs only after the protocol renderer materializes the
packet schema in the mounted read-only protocol directory; no rendered schema
is stored in the candidate.
