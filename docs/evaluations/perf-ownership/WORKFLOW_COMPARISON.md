# Workflow Comparison

## Shared task

- Canonical SQL: `evaluation/perf-tickets-by-customer.sql`
- Values: `customerId=42`, `limit=100`
- Dataset: 100,000 `perf_tickets` rows; 100 rows match
- Baseline: no customer index
- Candidate: temporary `perf_tickets_customer_id_id_idx`
- Evidence: ten native `pg` executions plus `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)`

| Metric | Arm A: Ashiba perf | Arm B: no Ashiba perf |
|---|---|---|
| Terminal execution wall time | 9.5 s, excluding container/setup and analysis | 1.7 s, excluding container/setup and analysis |
| Agent-token telemetry | unavailable | unavailable |
| Ashiba perf commands | 7 relevant invocations | 0 |
| Primary-flow files | 14 or more scenario/scaffold/evidence/report files | 3 JSON files plus the common native evaluator |
| Native DB operations | Required for timing and plan collection | Required for timing and plan collection |
| Retries | 0 | 0 |
| Median baseline / candidate | 5.943 ms / 1.356 ms | 5.360 ms / 1.236 ms |
| Plan change | Seq Scan to Bitmap Heap/Index Scan | Seq Scan to Bitmap Heap/Index Scan |
| Evidence completeness | Needs native raw results beside perf artifacts | Plain native JSON contains query, values, dataset, timing, and plan |
| Stale/fake prevention | Not provided beyond file existence | Explicit fields are reviewable; no automatic integrity guard claimed |

## Arm A observation

Ashiba created a scenario directory, requirements, index-policy prose, and JSON records. The evaluator still chose the dataset, created the index, executed native `pg`, captured the plan, extracted duration, and supplied them back to Ashiba. Generated `scenario measure` JSON cannot be consumed by `report diff`: duration is nested at `result.durationMs`, while diff only reads top-level, `summary`, or `metrics` duration. A manually created top-level report was needed for diff arithmetic.

## Arm B observation

Arm B used native `pg`, visible lowered SQL and values, `EXPLAIN ANALYZE`, and a plain JSON comparison. It required no Ashiba perf schema, directory convention, or report command. The short evaluator is specific to this evaluation and illustrates application-owned reconstruction, not a new product surface.

## Conclusion

The useful proof came from PostgreSQL execution and its plan. Ashiba perf only formalized surrounding notes and did not add evidence integrity or a capability unavailable to a small native workflow.
