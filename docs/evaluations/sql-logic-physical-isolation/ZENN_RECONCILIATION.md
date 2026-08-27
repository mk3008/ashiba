# Reconciliation with the historical pg-testkit article

## Historical claim

The article compared one concrete Traditional physical-isolation implementation
with fixture-rewritten SQL. It did not establish that every physical SQL test
must use schema-per-test isolation.

## Historical benchmark implementation

The closest article-era commit is `d31c257f17674e06b77608cdd978f6dcabb094d3`
(`chore(bench): include vitest config in tsconfig`), immediately after the
benchmark logging/rewrite work and before later benchmark changes. Its
Traditional path opened a new `pg.Client` per case, created a unique schema,
applied DDL per case, inserted each fixture row with a separate `INSERT`,
queried, dropped the schema with `CASCADE`, and closed the client.

## What was actually isolated

That design isolated every case in a private namespace and therefore included
the cost of namespace lifecycle, DDL lifecycle, row-at-a-time fixture writes,
and dedicated connection handling. It is a valid stronger-isolation design, not
the only physical-table design.

## Measurement semantics

The historical runner's `collectDurations` ran workers concurrently, but then
computed `durations.reduce((sum, value) => sum + value, 0)`. Its reported total
is therefore summed case latency, not actual suite wall-clock when parallelism
is greater than one. The article-era checked-in report itself used parallel 1,
so its quoted 300-case result does not conflate that specific table with
parallel wall-clock; the runner must nevertheless be qualified for parallel
interpretation.

## Differences from #77

#77 compared CTE fixture shadowing with a cheaper transaction-isolated physical
SQL-logic baseline. This evaluation isolates why that physical baseline differs
from the historical Traditional arm. Neither result changes #77's closed CTE
decision.

## Schema-per-test vs transaction-per-test

Suite-created shared schema plus `BEGIN` / fixture / canonical query /
`ROLLBACK` avoids per-case namespace and DDL lifecycle. In the primary matrix,
each concurrent case used non-colliding IDs and asserted its own result; it was
substantially faster while preserving fixture visibility only in the owning
session. Schema-qualified cross-schema SQL works naturally in the transaction
arm using the fixed real schema names. A test-specific schema cannot redirect
fixed schema-qualified SQL through `search_path`; it would need different SQL
names or a mapping/rewriter, which this evaluation deliberately does not add.

## Row-by-row vs batched fixtures

The historical helper executes one insert for every fixture row. The evaluation
measured 12 statements per case in row mode and four relation-batched statements
per case in batch mode. On PostgreSQL 18 serial transaction cases with
non-colliding IDs, fixture time fell from 8.27 ms to 3.13 ms.

## Connection reuse

Historical Traditional always creates and closes a dedicated client, even for
its `shared` label. The historical ZTD path can reuse a module-level client
when `exclusiveConnection` is false. The new schema-tuned and transaction arms
reuse pool connections; that is a deliberate implementation difference, not a
claim that namespace isolation itself requires connection churn.

## Parallel wall-clock vs summed latency

At c8, transaction-batch measured 48.11 ms suite wall-clock and 349.39 ms
summed case latency. Future suite-speed comparisons should use wall-clock as
the primary metric and label summed latency separately.

## PostgreSQL version sanity check

The historical run used PostgreSQL 18 Alpine; #77 used PostgreSQL 16. The
primary reconciliation run therefore used PostgreSQL 18. A smaller PostgreSQL
16 legacy-versus-batch run retained the same ordering, so version difference
did not explain the main result in these measurements.

## What remains valid in the old article

It validly demonstrates that fixture-rewritten testing avoided the costs of its
specific schema-per-test Traditional implementation. That implementation had
real namespace-isolation value.

## What should be qualified today

The result should not be generalized to transaction-isolated, pool-reused,
relation-batched physical SQL tests, and parallel totals should not be called
wall-clock when they are sums of case latency.

## Suggested addendum for the Zenn article

> This benchmark compared fixture rewriting with a schema-per-test physical
> setup that created DDL, inserted rows one at a time, and dropped a namespace
> for every case. A later PostgreSQL measurement found that shared-schema,
> same-session transactions with relation-batched fixtures can be much cheaper
> for read-oriented SQL logic tests. Parallel suite speed should be measured as
> wall-clock, separately from summed case latency.
