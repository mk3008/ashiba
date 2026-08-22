# Arm Treatment and Fairness

| Arm | Treatment |
| --- | --- |
| A | Minimum Ashiba v1: canonical SQL and its installed workflow; do not add product capabilities. |
| P | Prisma 8 RC installed contract/data-layer workflow. |
| S | sqlc TypeScript/Node generation and query workflow. |
| D | Drizzle's normal ORM/query workflow. |
| K | Kysely's normal typed-query workflow. |

All arms receive the same business requirement, database, model/effort, permissions, timebox, and runner evaluator. A runner-owned adapter may bridge CLI/function shape differences, but must not repair a candidate, create its transaction, or synthesize SQL/EXPLAIN evidence.

There are 20 transaction/concurrency cells: `5 arms x (T1 + T2) x 2 replicates`. W5 has `5 arms x 2 replicates = 10` cells. A third replicate is allowed only for a documented split. B1 is excluded: it is outside ordinary PostgreSQL-application scope and requires a separate builder benchmark.
