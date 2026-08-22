# Reproduction

1. Start a local PostgreSQL instance and set `ASHIBA_EVALUATION_DATABASE_URL` to an administrative test database URL (the default is the repository tutorial's local `postgres://postgres:postgres@127.0.0.1:5432/postgres`).
2. Build the two adapter packages: `pnpm --filter @ashiba-ts/driver-adapter-core build` and `pnpm --filter @ashiba-ts/driver-adapter-pg build`.
3. Run `node docs/evaluations/fixtures/raw-sql-normative-boundary/evaluator/evaluate.mjs <candidate-id>` once for every registered cell.
4. Inspect `evidence/<candidate-id>.json`; consolidate only runner output into `evidence/results.json`, then run `node docs/evaluations/fixtures/raw-sql-normative-boundary/evidence/verify-results.mjs`.
5. Run both controls under `reference/` before interpreting candidate records.

The evaluator creates and drops a randomized schema. It never mutates `public`, but it requires permission to create schemas in the target database. Reproduction on a different PostgreSQL version, `pg` version, model profile, or package commit is a new environmental observation, not a replacement of the registered run.
