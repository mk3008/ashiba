# Physical SQL logic fixture isolation

## Question

For physical-table SQL logic tests, is per-test schema isolation necessary, or
can a shared schema plus same-session transaction and rollback provide a safer,
lower-cost default for the measured read-oriented shape?

## Decision

**Classification: `transaction-fast-but-bounded`.** Shared schema + transaction
+ relation-batched fixtures + rollback was fastest and had zero observed
cross-scenario contamination. It is the recommended pattern for read-oriented
SQL logic tests that keep fixture insertion and canonical query on the same
client/session, use non-colliding keys, and can roll back their relevant state.

It is not complete database isolation. Same-key concurrent inserts can wait and
fail by lock timeout; a different session cannot see uncommitted fixture rows;
sequence values, internal commits, external side effects, and transaction-
external state need separate handling.

## Recommended measured pattern

1. Create schema and DDL once per suite.
2. Acquire a pool client for each case.
3. `BEGIN`, then insert fixture rows in relation-sized batches.
4. Execute canonical SQL on that same client.
5. Use unique IDs/tokens per concurrent case.
6. Assert and `ROLLBACK`, then release the client.
7. Measure parallel suite wall-clock, not summed latency.

## Evidence and limits

The PostgreSQL 18 primary run used 50 identical historical customer-summary
scenarios, five repetitions, and concurrency 1/4/8. `transaction-batch` won
all requested settings. See `BENCHMARK_RESULTS.md` and the raw JSON.

The multi-schema control executed fixed `sales.orders` / `master.customers`
SQL unmodified in one transaction and rolled it back. In contrast, a
schema-per-test namespace cannot redirect fixed qualified schema names through
`search_path` without a mapping or rewriter. No rewriter was introduced.

## Relationship to #77

This is not a CTE/ZTD adoption comparison. It does not alter #77, add rawsql-ts
to Ashiba, or introduce an Ashiba API, helper, dependency, CLI, or Scope rule.
The historical reconciliation is documented in `ZENN_RECONCILIATION.md`.
