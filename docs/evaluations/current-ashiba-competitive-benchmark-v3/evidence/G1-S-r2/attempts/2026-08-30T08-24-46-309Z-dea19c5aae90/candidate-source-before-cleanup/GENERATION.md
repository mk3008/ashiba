# sqlc generation record

`queries.sql` is the checked-in sqlc query source. The actual generated
PostgreSQL/pg runtime output is `src/generated/queries_sql.ts`; no handwritten
query facade remains. `src/application.ts` consumes the exported sqlc query
functions for every ticket data operation.

The frozen generator is `sqlc/sqlc:1.31.1` at
`sha256:70f53171d27b2424e9358869975455a6e955a5aa8e58a998a270a6e34e525537`.
The pinned plugin is `sqlc-gen-typescript` 0.1.2 from
`https://downloads.sqlc.dev/plugin/sqlc-gen-typescript_0.1.2.wasm`, SHA-256
`f8b59cdd78b35fae157a95c5813cb09b1ebdd9a31acf2d7015465539986ccd2b`.

The evaluator owns a templated nonce-schema DDL. It is rendered only into a
deleted temporary file, then mounted read-only for generation; no DDL is
copied into the candidate. The recorded Windows command is:

```powershell
$schema = Join-Path $env:TEMP 'g1-s-r2-sqlc-schema.sql'
(Get-Content -Raw ..\packet\schema.sql).Replace('{{schema}}', 'public') | Set-Content -NoNewline $schema
docker run --rm -v "${PWD}:/config/src" -v "${PWD}\sqlc.docker.yaml:/config/sqlc.yaml:ro" -v "${schema}:/config/schema/schema.sql:ro" sqlc/sqlc:1.31.1 generate -f /config/sqlc.yaml
Remove-Item -LiteralPath $schema -Force
```

This command was run successfully for the committed output; its provenance and
the generated-file SHA-256 are in `sqlc.provenance.json`.
