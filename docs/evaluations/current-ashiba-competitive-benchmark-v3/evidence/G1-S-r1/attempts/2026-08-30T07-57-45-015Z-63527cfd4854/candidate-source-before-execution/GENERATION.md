# sqlc generation

The main data-access path imports and calls the generated functions in
`src/generated/queries_sql.ts`. Generation uses sqlc 1.31.1 and the official
`sqlc-gen-typescript` 0.1.2 WASM plugin configured in `sqlc.yaml`.

The generator reads the immutable packet-owned `../packet/schema.sql`, removes
its template schema qualifier in a temporary file, and mounts that file
read-only at `/schema/schema.sql` for sqlc. The sqlc config reaches that mount
through its relative `../../schema/schema.sql` path. No runner DDL or schema input is
copied into the candidate source tree.

Run from the candidate root:

```powershell
npm run generate
```

Generated artifact:

- `src/generated/queries_sql.ts`
