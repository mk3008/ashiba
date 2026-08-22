# Brownfield Fresh-Agent dispatch ledger

All cells use the same worker profile, inherited workspace permissions, a
20-minute wall-clock deadline, and an isolated allocation. They receive only
the common candidate invariants, application semantics, schema/baseline in
their allocation, and their assigned change. They are not given product
mechanism names or evaluator internals.

| Cell | Assignment | Dispatched | Deadline | Status |
| --- | --- | --- | --- | --- |
| optional-state-r1 | Add three-state state filter | 2026-08-22T21:41:30+09:00 | 2026-08-22T22:01:30+09:00 | completed before deadline; independent E2E pass |
| optional-state-r2 | Add three-state state filter | 2026-08-22T21:41:30+09:00 | 2026-08-22T22:01:30+09:00 | completed before deadline; independent E2E pass |
| priority-order-r1 | Change priority business order | 2026-08-22T21:41:30+09:00 | 2026-08-22T22:01:30+09:00 | completed before deadline; independent E2E pass |
| priority-order-r2 | Change priority business order | 2026-08-22T21:41:30+09:00 | 2026-08-22T22:01:30+09:00 | completed before deadline; independent E2E pass |
| summary-rename-r1 | Rename name to summary | 2026-08-22T21:43:35+09:00 | 2026-08-22T22:03:35+09:00 | completed before deadline; independent E2E pass |
| summary-rename-r2 | Rename name to summary | 2026-08-22T21:43:35+09:00 | 2026-08-22T22:03:35+09:00 | completed before deadline; independent E2E pass |

The coordinator will mark a cell only from its filesystem result and runner
outcome, never from self-reported success.
