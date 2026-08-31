# sqlc generation

This candidate uses the sqlc 1.31.1 TypeScript/pg workflow for its main report
query. The generated query module is committed under `src/generated/`.

Generate it from the candidate root with:

```powershell
./scripts/generate-sqlc.ps1
```

The source inputs are `sqlc.yaml`, `src/db/schema.sql`, and
`src/db/queries.sql`.
