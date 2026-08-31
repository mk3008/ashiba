# G1 bounded greenfield assignment

Implement only `list`, `get`, `create`, `assign`, and `close` from the frozen
API. The data-access path must support optional status/assignee filtering,
bounded finite sorting with stable `id ASC` tie-breaker, pagination, hostile
value preservation, assignment plus audit in one transaction, and the
runner-owned audit-trigger rollback case. Do not implement T1, T2, or Q1
operations for this cell.
