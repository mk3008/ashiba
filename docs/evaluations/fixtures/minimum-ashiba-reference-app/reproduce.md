# Reproduce

Use a disposable or local PostgreSQL database account that may create and drop
schemas. The evaluator generates a nonce schema, runs all E2E assertions, writes
`results.json`, and drops that schema in `finally`.

```powershell
$env:ASHIBA_EVALUATION_DATABASE_URL = 'postgres://app_user:app_password@localhost:5432/app_db'
node docs/evaluations/fixtures/minimum-ashiba-reference-app/evaluator.mjs
```

The live runner is the authority for application behavior. Its small source
inspection only confirms the registered no-interpolation marker; it cannot
prove absence of every possible SQL construction path.
