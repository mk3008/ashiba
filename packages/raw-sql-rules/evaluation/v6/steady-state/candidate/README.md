# V6 steady-state listing change

`list-work-items.sql` lists one owner's work items and optionally applies a
bound `minPriority` (`NULL` means no priority filter). `regression.mjs` runs
the asset through native `mysql2/promise`, checks ordering, owner isolation,
the optional filter, and representative runtime result types, then rolls back.

Run from this directory while the disposable MySQL fixture is running:

```text
node regression.mjs
```
