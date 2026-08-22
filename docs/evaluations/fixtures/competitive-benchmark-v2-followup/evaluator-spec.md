# Runner-Owned Evaluator Specification

Each reference or comparative cell receives a freshly generated safe nonce schema. The evaluator owns DDL, seed data, inputs, independent parameterized assertions, and cleanup. It never imports candidate query models, generated artifacts, or tests.

## T1 oracle

Using a new connection after each call, assert success debits and credits exactly once and writes one audit row; insufficient funds leave balances and audit count unchanged; a forced failure after debit leaves balances and audit count unchanged; and inputs are passed as runtime values, not evaluator-composed SQL.

## T2 oracle

Run two candidate calls concurrently from separate connections. Assert distinct claimed IDs, no duplicate claim, correct final rows, and no retained claim after the rollback case.

## W5 oracle

Invoke the fixed starter entrypoint before and after the change. Assert the same page values/order and regression results, capture `EXPLAIN (FORMAT JSON)`, and independently establish that the final plan removes the intentionally slow deep-offset path or otherwise demonstrably improves the frozen plan metric.

The evaluator records strict result, live PostgreSQL result, first failed assertion, nonce, actual versions, cleanup, final-state evidence, EXPLAIN evidence, and source-diff metadata. `P/F/U` have the definitions in the [manifest](./manifest.md). Reference controls must pass before any Fresh-Agent cell starts.
