# Stage 3: Parallelism and Connection Reuse Results

## Question

Does a statement-local CTE fixture provide a material advantage for many
independent mapping cases when connection reuse, a pool, or concurrency are
available? This stage measures wall time separately from fixture isolation. It
does not revise the frozen Stage 2 serial measurements.

## Why statement-local fixtures might matter

Each CTE case carries its own `tickets` row inside its statement. Distinct cases
therefore do not write shared fixture state before reading it. This can remove a
fixture-state collision concern, but it cannot remove PostgreSQL, CPU, pool,
network, scheduler, or unrelated-lock contention. No speedup was assumed.

## Compared isolation models

| Arm | Fixture model | Isolation / cleanup responsibility |
| --- | --- | --- |
| Current seeded shared fixture | Schema plus all case rows seeded once, then read-only canonical SQL | Cases share a preloaded physical dataset; no per-case cleanup |
| Independent physical fixture | One unique row inserted in a transaction for each case, then rollback | Conventional transaction-local visibility and rollback per case |
| rawsql-ts CTE | One unique row supplied to `createPostgresTestkitClient` for each statement | Statement-local fixture; no physical fixture row or cleanup per complete case |

The independent physical arm deliberately uses transaction-isolated insert plus
rollback rather than container recreation, migration per test, or a new schema
per test. It is the smallest conventional physical mechanism that gives every
case its own row and automatic cleanup.

## Environment

- Windows (`win32`), Node `v22.14.0`, disposable PostgreSQL 16, and real `pg`.
- Canonical asset: `examples/postgres-ticket-queue-reference/src/tickets/get.sql`.
- Every case uses the Ashiba named-parameter compile/bind path and a unique ID,
  customer ID, and subject. It asserts exactly one returned row and that its ID
  and subject belong to the requesting case.
- Three warm samples per matrix cell. Schema/shared-fixture setup is recorded
  separately from case wall time; no container startup is timed.
- rawsql-ts: `@rawsql-ts/testkit-postgres@0.16.9`, public
  `createPostgresTestkitClient`, generated-format table metadata, and real `pg`.

## Connection models

- **Acquired per case:** each case calls `pool.connect()` and releases after its
  query or transaction. The pool remains warm.
- **Shared pool:** read-only seeded and CTE cases call `pool.query()`; the
  physical-transaction arm must acquire a pool client because a transaction is
  client-pinned. All cases still share the same pool.
- **Shared single client:** a reference only. node-postgres serializes queries
  on one client, so it is not database parallelism; effective concurrency is 1.

## Pool configuration

`pg.Pool({ max: 8 })` was shared by all non-single-client runs. Requested
concurrency was 1, 2, 4, and 8, so this matrix does not intentionally test a
pool smaller than the request. Acquisition timing still includes normal queue /
checkout delay when present.

## Concurrency matrix

Shared-pool wall-time medians in milliseconds. These are the per-run case wall
times, excluding the separately reported schema/shared-fixture setup.

| Arm / cases | 1 | 2 | 4 | 8 |
| --- | ---: | ---: | ---: | ---: |
| Seeded shared / 10 | 7.15 | 3.75 | 2.21 | 2.19 |
| Seeded shared / 50 | 34.36 | 15.67 | 9.23 | 8.79 |
| Seeded shared / 100 | 67.82 | 31.61 | 18.51 | 15.28 |
| Seeded shared / 300 | 207.09 | 95.51 | 54.38 | 36.49 |
| Independent physical / 10 | 24.46 | 12.40 | 9.09 | 5.60 |
| Independent physical / 50 | 127.39 | 60.88 | 38.07 | 21.13 |
| Independent physical / 100 | 237.70 | 125.60 | 73.68 | 38.45 |
| Independent physical / 300 | 708.69 | 418.17 | 191.90 | 107.95 |
| rawsql-ts CTE / 10 | 10.25 | 5.87 | 10.60 | 10.05 |
| rawsql-ts CTE / 50 | 48.86 | 27.48 | 33.59 | 29.73 |
| rawsql-ts CTE / 100 | 98.40 | 52.51 | 52.98 | 47.09 |
| rawsql-ts CTE / 300 | 292.18 | 162.61 | 168.89 | 145.12 |

The single-client 300-case reference was 215.25 ms seeded, 748.42 ms
independent physical, and 284.26 ms rawsql CTE. It is deliberately not read as
parallel performance.

## Test-count matrix

Best observed wall time across the three connection models and requested
concurrency, shown with its configuration. Setup is still separate.

| Cases | Seeded shared fixture | Independent physical fixture | rawsql-ts CTE |
| ---: | --- | --- | --- |
| 10 | 1.92 ms, acquired / 8 | 5.60 ms, shared pool / 8 | 5.87 ms, shared pool / 2 |
| 50 | 5.99 ms, acquired / 8 | 21.13 ms, shared pool / 8 | 27.48 ms, shared pool / 2 |
| 100 | 13.06 ms, acquired / 8 | 38.45 ms, shared pool / 8 | 47.09 ms, shared pool / 8 |
| 300 | 34.41 ms, acquired / 8 | 107.95 ms, shared pool / 8 | 123.43 ms, acquired / 8 |

## Fixture isolation method

All normal matrix cases passed their per-case ID/subject assertions. The CTE
arm uses no fixture-state lock, transaction, cleanup, unique table, or schema:
the unique row is supplied in the statement-local fixture. The physical arm
needed transaction setup plus rollback; its 300-case / shared-pool / 8 median
accumulated 473.54 ms of fixture setup and 219.01 ms of rollback time across
concurrent cases, although its wall time overlapped that work.

## Wall-time results

The current shared seeded baseline is fastest at every tested count. rawsql CTE
does not overtake the conventional independent physical arm either: at the best
300-case cell it is 123.43 ms versus 107.95 ms. There is no measured break-even
threshold through 300 independent cases with pool max 8.

## Connection/pool observations

Concurrency helped the two physical arms monotonically within this environment.
rawsql CTE did not improve monotonically: shared-pool concurrency 2 was its
best result at 10 and 50 cases, while 8 was best at 100 and 300. This is a
measurement, not an attribution to one resource. At acquired-per-case / 8 / 300
the CTE arm accumulated 12.69 ms acquisition time, compared with 2.15 ms for
the independent physical arm; pool max was not smaller than requested
concurrency, so deliberate pool starvation was not present.

## Cross-test contamination results

There were zero cross-test contamination failures in all matrix cells. An
explicit 100+-case unique-token assertion is embedded in each arm's matrix
run: a row with another case's ID or subject would fail the harness.

## Physical-fixture isolation cost

The physical independent arm is not a strawman: it uses one warm database,
one shared pool, ordinary transactions, one insert, canonical read, rollback,
and release. Its additional mechanism is visible and measured. CTE statement
locality removes that fixture mechanism, but the mature rewriter/query cost is
large enough that it did not yield a wall-time win here.

## rawsql-ts rewrite cost

`raw.query(...)` includes ordinary public-path fixture construction and AST
rewrite for every statement. At acquired-per-case / 8 / 300 it accumulated
957.78 ms across case calls; executor DB time was 858.84 ms and acquisition was
12.69 ms. The residual is an approximate client-side rewrite/fixture overhead,
not an isolated CPU profiler result. Warm DDL-derived manifest freshness was
0.049 ms at that cell and is recorded separately; it does not model an upstream
manifest-generation workflow.

## Physical fallback negative control

The released rawsql-ts behavior from Stage 2 remains: a complete fixture
returns the fixture row, but an empty `tableRows` array with
`missingFixtureStrategy: 'error'` returned a deliberately inserted physical
sentinel. Stage 3 uses the released behavior unchanged and adds no Ashiba
wrapper to hide it.

## Interpretation

**Stage 3 classification: isolation-advantage-only.** Statement-local fixtures
demonstrably keep independently varying fixture rows separate without a physical
fixture isolation mechanism. That is useful structural evidence. It is not a
default-path result: shared seeded physical data remains substantially faster,
and rawsql CTE did not beat even conventional transaction-isolated physical
fixtures in the measured matrix.

## Break-even / no break-even

No break-even was observed through 300 independent cases, concurrency 1/2/4/8,
and pool max 8. A later specific-scale claim needs a production-like corpus
that exceeds this range and proves a materially larger total win, not a small
wall-time difference.

## Limitations

This is a local, warm, one-query, one-row-per-case PostgreSQL measurement with
three samples. It does not test a pool smaller than requested concurrency,
network latency, multi-relation fixture size, write behavior, or a different
rawsql-ts release. It does prove neither that CTE fixtures are universally slow
nor that all physical fixtures require this transaction form.
