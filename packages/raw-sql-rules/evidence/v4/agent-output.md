# V4 fresh-agent implementation output

The durable primary evidence is the actual candidate code and tests. The
initial candidates under `evaluation/v4/probes/{a1,a2,b1,b2}/candidate/` are
preserved preflight evidence, not treatment evidence, because the shared
fixture README was absent at dispatch. The corrected treatment candidates are
under `evaluation/v4/probes/run2/`. Agents were not told an expected result.

| Probe | Arm | Agent-reported completion | Actual candidate/test observation |
| --- | --- | --- | --- |
| initial A1/A2/B1/B2 | preflight only | mixed | Retained without alteration; not comparable because the common fixture packet was incomplete. |
| corrected A1 | Rules only | `done`; unit 4 and integration 1 passed. | `RUN_MYSQL_INTEGRATION=1` native mysql2 test executed representative assets. |
| corrected A2 | Rules only | `done`; six database-enabled tests passed. | `RUN_DB_TESTS=1` native mysql2 test executed application SQL. |
| corrected B1 | completion contract | `done`; three tests passed. | Native mysql2 test seeded and queried MySQL in a transaction. |

The agent final outputs are summarized here without replacing candidate diffs.
Independent classification is intentionally separate in
`independent-reviews.md`.
