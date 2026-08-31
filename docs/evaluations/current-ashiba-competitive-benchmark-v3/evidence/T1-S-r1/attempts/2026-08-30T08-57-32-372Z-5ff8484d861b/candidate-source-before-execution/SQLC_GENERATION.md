# sqlc generation record

Generated query module: `src/generated/transfer.ts`

Source query file: `src/queries/transfer.sql`

Toolchain: sqlc `1.31.1`; `sqlc-gen-typescript` `0.1.3`; runtime `node`; driver `pg`.

The frozen evaluator owns the schema DDL, so no schema copy is retained in this
candidate. To regenerate the checked-in module, mount the evaluator-provided
schema source alongside this query source and invoke:

```text
sqlc generate -f sqlc.yaml
```

The generated module is checked in because the evaluator builds and imports the
candidate without providing a generation-time schema file.
