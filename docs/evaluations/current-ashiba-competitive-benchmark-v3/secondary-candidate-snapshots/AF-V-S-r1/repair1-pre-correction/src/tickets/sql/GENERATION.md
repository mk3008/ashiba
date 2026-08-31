# sqlc generation record

The main ticket data-access path is generated from `queries.sql` against the
runtime ticket schema supplied by the application environment. It uses sqlc
1.31.1 with the official `sqlc-gen-typescript` 0.1.2 plugin configured in the
repository-root `sqlc.yaml`.

```powershell
sqlc generate
```

The generated output is committed at `generated/queries.ts` so the candidate
can build without a network fetch during evaluation.
