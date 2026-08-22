# v2 Non-Pass Classification

This retrospective classification uses preserved runner-owned original-v2
records. It does not change a candidate, rerun a cell, or claim a tool-wide
limitation.

Categories: **1** candidate implementation defect; **2** agent workflow misuse;
**3** missing/incompatible public boundary; **4** protocol mismatch; **5** runtime
dependency/setup failure; **6** evaluator/harness defect; **7** environment/
isolation failure; **8** workload ambiguity/overconstraint; **9** plausible
product/tool limitation; **10** insufficient evidence. A single Fresh-Agent
artifact is not category 9 merely because it failed.

| Run | Result | Primary | Secondary | Runner-owned fact |
| --- | --- | --- | --- | --- |
| A-B1-r1 | F | 3 | 8 | Hard-coded `public.customers`; no executable nonce `users` boundary. |
| A-W4-r1 | F | 1 | — | Foreign key references missing `id` column. |
| A-W4-r2 | F | 1 | — | Schema/table metadata interpolates as `[object Object]`. |
| A-W5-r1 | F | 5 | — | `pg` runtime dependency cannot be resolved. |
| A-W5-r2 | F | 5 | — | `pg` runtime dependency cannot be resolved. |
| P-B1-r1 | F | 3 | 8 | No live nonce `users` boundary; domain/public-schema mismatch. |
| P-W1-r1 | F | 1 | 3 | Candidate fixes the relation to `public.users`. |
| P-W1-r2 | F | 1 | 3 | Candidate fixes the relation to `public.users`. |
| P-W3-r1 | F | 1 | — | BigInt raw-SQL interpolation lacks an explicit codec. |
| P-W3-r2 | F | 1 | 3 | Candidate fixes the relation to `public.users`. |
| P-W4-r1 | U | 3 | 8 | Contract source exists but no generated artifact or runnable entrypoint. |
| P-W4-r2 | F | 1 | — | Transfer inserts `NULL account_id`; success final state is unobserved. |
| P-W5-r2 | F | 4 | — | Process exits 0 but produces empty/invalid JSON. |
| S-B1-r1 | F | 1 | 3 | Unrelated id/email/name query, not the required public boundary. |
| S-W1-r1 | F | 5 | 1 | Declared `pg` package cannot be resolved. |
| S-W1-r2 | F | 5 | 1 | Declared `pg` package cannot be resolved. |
| S-W2-r1 | F | 5 | 1 | Declared `pg` package cannot be resolved. |
| S-W2-r2 | F | 1 | 3 | Generated `users_sql.js` module is missing. |
| S-W3-r1 | F | 5 | 7 | SCRAM password is not a string; runtime setup is invalid. |
| S-W4-r1 | U | 3 | 1 | No generated query module or executable entrypoint. |
| S-W4-r2 | F | 1 | 3 | Ledger boundary rejects unsupported `account_id` column. |
| S-W5-r1 | U | 4 | 6 | SQL/EXPLAIN only becomes available by mutating run evidence. |
| S-W5-r2 | U | 4 | 6 | SQL/EXPLAIN only becomes available by mutating run evidence. |
| D-B1-r1 | F | 1 | 3 | Candidate exposes an unrelated query shape. |
| D-W1-r1 | U | 7 | 10 | Directory contains only isolation marker; candidate cause cannot be proven. |
| D-W1-r2 | U | 7 | 10 | Directory contains only isolation marker; candidate cause cannot be proven. |
| D-W2-r2 | F | 1 | 3 | CLI imports missing `src/users.js`. |
| D-W4-r1 | U | 1 | 3 | No implementation beyond dependency artifacts. |
| D-W4-r2 | F | 1 | 3 | Transfer queries incompatible ledger columns. |
| D-W5-r1 | U | 4 | 6 | Command emits rows only; SQL/EXPLAIN capture mutates evidence. |
| D-W5-r2 | U | 4 | 6 | Capture requires evidence mutation. |
| K-B1-r1 | F | 1 | 3 | Account-query example, not the `users` boundary. |
| K-W3-r2 | U | 3 | 8 | Input/output users shape is incompatible with frozen W3. |
| K-W4-r1 | F | 1 | — | `SKIP LOCKED` claim fails; final state is not established. |
| K-W4-r2 | F | 1 | 3 | Required `ledger_entry_id` column does not exist. |

## Totals and interpretation

Primary counts are: category 1 **17**, 3 **5**, 4 **5**, 5 **6**, 7 **2**.
Categories 2, 6, 8, 9, and 10 have no primary assignment. The W5
evidence-protocol issue is category 6 only as a secondary cause: it made
candidate SQL/EXPLAIN inaccessible to a non-mutating evaluator; it is not
evidence that the workload itself was impossible.

The original all-arm W4 failure therefore does not establish intrinsic tool
weakness at transactions or concurrency. It was dominated by incomplete or
incompatible candidate boundaries and schema/implementation defects, while
also combining two questions. The follow-up separates T1 and T2 and requires a
passing runner-owned reference control before a Fresh-Agent cell starts.
