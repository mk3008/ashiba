# X1 assignment: bounded report composition

Implement an ESM TypeScript/Node application entrypoint that exports:

```ts
createReportApplication(runtime): ReportApplication | Promise<ReportApplication>
```

`runtime` contains a non-superuser PostgreSQL connection string and a nonce
schema. Use the arm's normal workflow. Do not create DDL, migrations, database
roles, schemas, or runner fixtures. Do not use another candidate, the runner,
or a workspace dependency.

Implement `runReport(input)` for the exact closed request vocabulary described
in `RUNNER_API.md`. It returns grouped rows plus non-empty `sourceSql`,
`executedSql`, and the bound parameter values. SQL-looking tag input must be a
value, never SQL syntax. Dynamic projection, optional tag join, grouping, and
predicate selection must be selected only from reviewed source-controlled
terms. Unknown vocabulary rejects with `{ code: 'VALIDATION' }`.

Implement idempotent `close()`. Keep the application source and query logic
visible and preserve the arm treatment; do not bypass the treatment by moving
the primary path to native `pg` unless that arm is `G` or `A`.
