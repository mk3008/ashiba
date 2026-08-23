# Reproduce

From `marker-free-g4`:

```sh
node scripts/verify.mjs
node scripts/test.mjs
node scripts/postgres-live.mjs
```

`postgres-live.mjs` needs a PostgreSQL URL through
`ASHIBA_VERSIONED_ARTIFACT_DATABASE_URL` (the evaluator default is a local,
temporary container). It invokes no AI and no generator. The application policy
is `application/list-ordering.mjs`; the artifact remains placement-only.
