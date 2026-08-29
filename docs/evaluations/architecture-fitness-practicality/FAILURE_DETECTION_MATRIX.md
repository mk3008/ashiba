# Failure Detection Matrix

| Failure | Detection point | Before DB execution? |
| --- | --- | --- |
| missing / unused input | `bindNamedParameters` | yes |
| hostile string | retained as driver value, not SQL text | yes |
| stale binding artifact | `model-gen --check`, exit 1 | yes |
| missing DDL column | `ddl-missing-column` lint error | yes |
| invalid SQL AST | query-uses strict focused regression | yes |
| stale SQL / false contract type | Ticket Queue contract negatives | before release |
| audit failure | Ticket Queue rollback test | during execution |

Business semantics and semantic cross-wiring remain application/live-test
authority.
