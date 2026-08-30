# Scale results

The harness fixture includes CTEs, aliases, joins, nullable filters, literals,
and pagination. It runs comment-only, semantic predicate, parameter add/remove,
result add/remove, table/column, and query add/remove controls.

| Fleet | Arm A affected | Arm B changed paths | Arm C affected | Temporary snapshot bytes |
| --- | ---: | ---: | ---: | ---: |
| 20 | 2 | 2 | 2 | 178,199 |
| 300 | 2 | 2 | 2 | 2,667,959 |
| 3000 | 2 | 2 | 2 | 26,715,159 |

All Arms selected the same two source changes in the scale exercise. The
existing unit test separately demonstrates deterministic 100-query compact
payload reduction (five affected queries and 95% canonical bytes avoided).

This is a scale/candidate-reduction observation, not an end-to-end 3000-query
PostgreSQL benchmark and not a token/credit claim. Token and credit telemetry
were unavailable.
