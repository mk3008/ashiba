# Frozen workload matrix

G1, T1, T2, and Q1 are different constructs and are never summed into a
winner score. AF-V/AF-L measure only required architecture movement. X1,
schema/migration, schema drift, and exit exercises are separate controls.

| ID | Frozen task | Runner-owned assertions | Non-goal |
| --- | --- | --- | --- |
| G1 | Ticket list/get/create/assign, optional filters, finite sort, pagination, hostile values; then add one filter/sort/result-shape maintenance change | output shape, filtering, sorting/tie, paging, binder/input control where treatment provides it, commit/rollback | migration ownership |
| T1 | debit + credit + audit as one transaction | success, insufficient funds, injected post-debit error, final DB state | concurrency/retry policy |
| T2 | two workers claim queued work | no duplicate, two distinct claims, rollback restores item | generic job framework |
| Q1 | PostgreSQL CTE/window/aggregate/CASE/enum/domain/JSONB/array/nullable join/bigint/cast query; investigate executed SQL and EXPLAIN; improve while retaining behaviour | result equivalence, runner-collected EXPLAIN, source/executed SQL trace | database performance ranking |
| AF-V | add the frozen data feature to a supplied VSA skeleton | API/behaviour and required structure movements | judging preferred architecture |
| AF-L | same feature in layered skeleton | API/behaviour and required structure movements | judging preferred architecture |
| X1 | open-ended projection/join/predicate/grouping report | separate live result and composition safety | inclusion in primary aggregate |
| SD | alter DB schema without source changes | record detection stage | ranking schema ownership |
| E1 | remove selected tool from a successful candidate while retaining behaviour | files/artifacts/repairs required | universal removability claim |

