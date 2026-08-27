# Physical SQL logic isolation benchmark results

## Method

The primary run used real PostgreSQL 18, real `pg`, 50 identical customer-summary
scenarios, concurrency 1/4/8, and five repetitions. The canonical SQL, four
relations, twelve fixture rows, and expected summary were restored from the
historical benchmark commit `d31c257f17674e06b77608cdd978f6dcabb094d3`.

The primary metric is suite wall-clock. Sum of case latency is reported only to
show why it must not be used as a parallel suite completion metric.

## Mean 50-case result, PostgreSQL 18

| Arm | c1 wall ms | c4 wall ms | c8 wall ms |
| --- | ---: | ---: | ---: |
| schema-legacy | 2546.63 | 816.70 | 448.10 |
| schema-tuned | 1446.52 | 441.04 | 262.50 |
| transaction-row | 556.81 | 155.32 | 90.87 |
| transaction-batch | 312.86 | 94.46 | 48.11 |

`transaction-batch` was fastest at every requested concurrency. After normal
cases were changed to non-colliding fixture IDs, c8 was its best observed
wall-clock setting in this local pool.

## Parallel metric distinction

At c8, transaction-batch completed in 48.11 ms wall-clock but accumulated
349.39 ms of individual case latency. For schema-legacy the corresponding
values were 448.10 ms and 3,307.04 ms. Summed latency is useful for contention
diagnosis, not for claiming suite completion time.

## Mean per-case phase timing, PostgreSQL 18

| Arm / c | connect | create schema | DDL | insert | query | drop schema | begin | rollback |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| legacy / 1 | 7.17 | 1.81 | 10.83 | 18.53 | 2.34 | 8.94 | 0.00 | 0.00 |
| tuned / 1 | 0.01 | 1.60 | 9.50 | 7.27 | 1.10 | 8.70 | 0.00 | 0.00 |
| row / 1 | 0.01 | 0.00 | 0.00 | 8.27 | 0.94 | 0.00 | 0.61 | 0.63 |
| batch / 1 | 0.01 | 0.00 | 0.00 | 3.13 | 1.09 | 0.00 | 0.65 | 0.68 |

The legacy connection phase measures `client.connect()` (7.17 ms); it excludes
only synchronous `new Client(...)` object construction. Schema lifecycle
(create + DDL + drop) is about 21.58 ms per serial legacy case, versus
transaction lifecycle (begin + rollback) about 1.33 ms for transaction-batch.
Batched inserts reduce the serial fixture phase from 8.27 ms to 3.13 ms
relative to transaction-row.

Every normal case used a deterministic, non-colliding ID offset. The matrix
performed 3,000 case-specific result assertions across all arms and cells,
including expected customer IDs, order counts, amounts, and row count. It
observed zero cross-scenario contamination and zero fixture rows remaining in
the shared schema after every matrix cell.

## PostgreSQL 16 sanity run

Two repetitions of schema-legacy versus transaction-batch on PostgreSQL 16
produced mean wall-clock values of 3308.19/1009.25/607.40 ms for legacy and
290.90/89.77/66.96 ms for batch at c1/c4/c8. This small version check does
not establish a universal PostgreSQL-version model; it confirms that the
strategy ordering did not reverse between these runs.

Full raw measurements are in `physical-isolation-results.json` and
`physical-isolation-pg16-sanity-results.json`.
