# Goal-driven implementation probe output

The `evaluation/v3/probes/*/candidate/` directories are the unmodified actual
agent-created implementations. This record preserves the agents' concise
completion outputs and points to their diffs.

| Probe | Goal | Actual candidate evidence | Agent-reported execution |
| --- | --- | --- | --- |
| P01 | Sort + optional filter from runtime input | Complete sort SQL assets; finite mapping; named null guard; mock-only test. | Node test: 3 passed. |
| P02 | Account status with canonical DDL plus migrations | Candidate reads `repository/schema/accounts.sql`, not migrations; uses named sqlite bindings. | Python unittest: 3 passed. |
| P03 | Difficult two-audience aggregate report | Two complete SQL assets, fixed audience mapping, named sqlite binding, real SQLite in-memory engine tests. | Python unittest: 5 passed. |
| P04 | Add work-item result behavior with DB regression | MySQL SQL assets; mysql2 native named binding; real DB JSON representation test. | Node test: 1 passed. |
| P05 | Deciding repeat of P01 goal | Complete sort SQL assets and named bindings, but mock-only test again. | Node test passed after the interrupted agent left its actual files. |

P01 and P05 are retained as observed failures to add Rule 8 real-database
coverage. They are not rewritten as passes because their SQL-safety portions
passed.
