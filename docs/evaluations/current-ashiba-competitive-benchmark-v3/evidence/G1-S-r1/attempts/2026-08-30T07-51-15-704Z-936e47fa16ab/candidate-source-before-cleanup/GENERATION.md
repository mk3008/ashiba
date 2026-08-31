# sqlc generation

The main data-access path imports and calls the generated functions in
`src/generated/queries_sql.ts`. Generation uses sqlc 1.31.1 and the official
`sqlc-gen-typescript` 0.1.2 WASM plugin configured in `sqlc.yaml`.

Run from the candidate root:

```powershell
docker run --rm -v "${PWD}:/src" -w /src sqlc/sqlc:1.31.1 generate
```

Generated artifact:

- `src/generated/queries_sql.ts`
