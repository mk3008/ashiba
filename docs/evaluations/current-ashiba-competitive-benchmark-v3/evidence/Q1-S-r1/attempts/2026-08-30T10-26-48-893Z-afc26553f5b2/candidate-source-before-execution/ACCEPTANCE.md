# Q1-S-r1 acceptance plan

## Source issue

Implement the frozen Q1 PostgreSQL investigation operations for the sqlc TypeScript arm.

## Why it matters

The evaluator needs the business rows and reproducible SQL/plan evidence from a parameterized, generated-query data-access path.

## Acceptance items and verification

1. `investigate` invokes the sqlc-generated `investigateCustomers` query and returns the frozen query's business columns. Verify with TypeScript compilation and candidate runtime tests.
2. `explain` uses the same generated SQL text and arguments with `EXPLAIN (FORMAT JSON)`. Verify that the compiled method returns PostgreSQL's JSON plan value.
3. Both operations expose identical source/executed SQL and ordered parameters. Verify from their shared generated query constant and argument construction.
4. `close` is idempotent and later Q1 operations reject with `APPLICATION_CLOSED`. Verify with a stubbed pool test.

## Working rules

No candidate-owned DDL or migrations are included. Runtime uses only `runtime.connectionString`; it does not read `DATABASE_URL`.
