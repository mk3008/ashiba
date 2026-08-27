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
| schema-legacy | 2591.47 | 785.37 | 456.34 |
| schema-tuned | 1493.26 | 459.16 | 254.15 |
| transaction-row | 567.39 | 462.02 | 497.03 |
| transaction-batch | 270.87 | 189.45 | 222.17 |

`transaction-batch` was fastest at every requested concurrency. In this local
pool, c4 was its best observed wall-clock setting; c8 adds contention rather
than an automatic speedup.

## Parallel metric distinction

At c8, transaction-batch completed in 222.17 ms wall-clock but accumulated
1,658.55 ms of individual case latency. For schema-legacy the corresponding
values were 456.34 ms and 3,373.81 ms. Summed latency is useful for contention
diagnosis, not for claiming suite completion time.

## Mean per-case phase timing, PostgreSQL 18

| Arm / c | connect | create schema | DDL | insert | query | drop schema | begin | rollback |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| legacy / 1 | 0.00 | 1.64 | 11.33 | 18.49 | 1.89 | 9.59 | 0.00 | 0.00 |
| tuned / 1 | 0.00 | 1.53 | 10.08 | 7.21 | 1.47 | 9.18 | 0.00 | 0.00 |
| row / 1 | 0.00 | 0.00 | 0.00 | 8.45 | 1.02 | 0.00 | 0.62 | 0.64 |
| batch / 1 | 0.00 | 0.00 | 0.00 | 2.75 | 0.87 | 0.00 | 0.58 | 0.59 |

Connection creation is included in `schema-legacy` total but its timing
instrumentation starts after the dedicated client is constructed, so the phase
table must not be read as a complete client-connect profile. The direct legacy
arm remains faithful to its dedicated-client behavior; total wall-clock is the
authoritative value. Schema lifecycle (create + DDL + drop) is about 22.56 ms
per serial legacy case, versus transaction lifecycle (begin + rollback) about
1.17 ms for transaction-batch. Batched inserts reduce the serial fixture phase
from 8.45 ms to 2.75 ms relative to transaction-row.

## PostgreSQL 16 sanity run

Two repetitions of schema-legacy versus transaction-batch on PostgreSQL 16
produced mean wall-clock values of 3069.86/891.22/563.33 ms for legacy and
286.53/195.90/223.64 ms for batch at c1/c4/c8. This small version check does
not establish a universal PostgreSQL-version model; it confirms that the
strategy ordering did not reverse between these runs.

Full raw measurements are in `physical-isolation-results.json` and
`physical-isolation-pg16-sanity-results.json`.
