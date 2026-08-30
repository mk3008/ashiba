# sqlc generation record

`queries.sql` is the checked-in sqlc query source. The generated PostgreSQL/pg
runtime output is `src/generated/queries.ts`; `src/application.ts` consumes
only those generated query functions for ticket data access.

The normal generation command is `sqlc generate` with sqlc 1.31.1 and the
`sqlc-gen-typescript` 0.1.2 WASM plugin pinned in `sqlc.yaml`. The evaluator
owns the rendered nonce-schema DDL, so no runner schema or DDL is copied into
this candidate.
