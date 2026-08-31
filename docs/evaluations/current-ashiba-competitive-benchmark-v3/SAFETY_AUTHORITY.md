# Safety authority matrix

| Concern | Possible authority under the frozen treatments | What this benchmark can observe |
| --- | --- | --- |
| Parameter value separation | binder/runtime/query API and PostgreSQL | hostile SQL-looking value control |
| Missing or unused input | Ashiba binder where used; candidate validation/runtime elsewhere | runner API and treatment evidence |
| Unknown finite sort | application finite mapping or tool API | runner rejection/behavior checks |
| Transaction atomicity | application/tool transaction boundary plus PostgreSQL | T1 final database state |
| Concurrent claim | candidate SQL/tool transaction strategy plus PostgreSQL | T2 final database state |
| Nullable, bigint, JSON, DB semantics | TypeScript/tool types and PostgreSQL | workload-specific live behavior |
| Schema drift | generation/contract step, app tests, or PostgreSQL execution | SD control when completed |

No column is a universal quality ordering. A detection stage has different
freshness, false-positive, operational, and maintenance characteristics.
Ashiba's deterministic named-parameter rejection is a treatment property, not
a replacement for PostgreSQL semantic validation or application tests.
