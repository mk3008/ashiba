# Reconstructibility

## Result

AI/native-tool reconstructibility is **high** for the evaluated workflow.

Given visible SQL, parameter values, a PostgreSQL connection, and a completion condition, ordinary native tools produced baseline/candidate timing, `EXPLAIN ANALYZE`, a sandbox index experiment, and plain JSON comparison. No Ashiba perf command or schema was required.

| Question | Observation |
|---|---|
| External instructions required | No perf-specific instruction beyond the completion condition. |
| Persisted custom code required | No product code. A short native `pg` script was used for this evaluation. |
| Next-run reuse required | No; an application can recreate or keep a local script as needed. |
| One-off reconstruction cheaper | Yes; no scenario schema, migration, or perf command knowledge was needed. |
| Clean-room limitation | Same evaluator had already inspected perf source; this is not a fresh-agent result. |

This does not claim benchmark work is trivial. It shows the current Ashiba-specific wrapper is not necessary to obtain the measured proof. A future keep decision needs repeated measurable native-tool/agent failure or a small independently valuable integrity guard.
