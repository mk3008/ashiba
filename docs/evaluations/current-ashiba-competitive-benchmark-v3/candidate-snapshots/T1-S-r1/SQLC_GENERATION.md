# sqlc generation record

Generated query module: `src/generated/sqlc/transfer_sql.ts`

Source query file: `src/queries/transfer.sql`

Toolchain: sqlc `1.31.1`; `sqlc-gen-typescript` `0.1.3`; runtime `node`; driver `pg`.

The frozen evaluator owns the schema DDL, so no schema copy is retained in this
candidate. `sqlc.provenance.yaml` records the sqlc configuration and output
path. The Docker provenance command expands the read-only packet DDL into the
temporary `sqlc-schema-input.sql`, invokes sqlc, then removes that file before
the candidate is retained. No schema DDL is checked into the candidate.

To regenerate the checked-in module:

```text
<replace {{schema}} with public in packet/schema.sql and write it temporarily
to candidate/sqlc-schema-input.sql>
docker run --rm -v <candidate>:/workspace/candidate -w /workspace/candidate \
  sqlc/sqlc:1.31.1 generate -f sqlc.provenance.yaml
<remove candidate/sqlc-schema-input.sql>
```

The generated module is checked in because the evaluator builds and imports the
candidate without providing a generation-time schema file.
