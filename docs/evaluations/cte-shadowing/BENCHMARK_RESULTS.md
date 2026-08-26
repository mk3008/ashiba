# Benchmark Results: CTE Shadowing vs Seeded PostgreSQL Fixtures

## Environment and method

- OS: Windows (`win32`); Node `v22.14.0`; local disposable PostgreSQL 16
  container; `pg` 8.21.0 from the Reference dependency graph.
- Warm measurements only. Container startup is excluded and must not be
  compared with warm suite execution.
- Seven samples per suite size. Each seeded sample performs the Reference's
  actual `drop -> schema -> seed` suite setup once, then runs the selected
  mapping check N times. The shadowed sample transforms the source query once,
  opens a transaction, uses `search_path = pg_temp`, and executes N times.
- One relation / three typed CTE rows is the measured mapping fixture. The
  harness separately exercises two relations for the join shape. Values remain
  parameters; the 300-check SQL body is 542 bytes.
- Values are local-machine observations, not cross-machine benchmarks. Raw
  samples and schema version are in `benchmark-results.json`.

## Median warm timings (ms)

| Checks | Seeded setup | Seeded execution | CTE transform | CTE execution |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 14.25 | 0.81 | 0.058 | 2.26 |
| 10 | 14.25 | 7.57 | 0.040 | 9.79 |
| 50 | 12.76 | 32.32 | 0.040 | 35.56 |
| 100 | 17.80 | 60.60 | 0.031 | 65.33 |
| 300 | 19.00 | 177.07 | 0.046 | 191.47 |

With only seven samples, p95 is nearest-rank and indicative rather than precise.
The total warm medians / p95 (setup plus execution, or transform plus execution)
were: 1 checks seeded 15.04 / 22.19 vs CTE 2.30 / 2.88; 10 checks 22.05 / 41.08
vs 9.86 / 10.98; 50 checks 44.49 / 54.30 vs 35.60 / 75.57; 100 checks 77.83 /
83.87 vs 65.36 / 68.08; 300 checks 195.26 / 245.59 vs 191.52 / 200.69.

CTE *execution* median was slower at every measured size. Its small total win
comes only from omitting the already-small suite setup; it is 3.74 ms at 300
checks and 12.47 ms at 100 checks before drift/safety ownership is counted.

## Interpretation

This is not a comparison against per-test container start, migration, or seed.
Those costs would make seedless SQL look better but are not the current
Reference design. In this suite, the initial 12–19 ms physical setup is
amortized across a suite, while each CTE query transports and type-casts fixture
rows again.

For an occasional local run or PR CI, a 4–12 ms raw difference is not materially
useful. Even ten 100-check loops in a day save only about 125 ms before the
drift check and debugging cost. The measured candidate has no scale-specific
case that repays its additional ownership cost through 300 checks.

## Relation scaling and limits

The current harness has a two-relation join with one event row. It proves that
the typed fixture representation works across a join, but does not claim a
10-relation production-scale result. Every added relation increases CTE text,
placeholder shifting, fixture typing, and the chance of a source-reference
coverage mistake. A valid adoption claim would need a corpus-level measurement
including 4 and 10+ relations, transformed SQL bytes, diagnostics, and an
authoritative drift guard. This experiment deliberately stops short of creating
a general framework solely to manufacture that benchmark.
