# V5 steady-state insert change

`insert-work-item.sql` is the application DML asset for inserting a work item.
`regression.mjs` executes it through native `mysql2/promise` with named
parameters, verifies the inserted row through the listing asset, and confirms
that MySQL rejects an invalid `state` and a `NULL amount` under the canonical
fixture constraints. The transaction is rolled back after the checks.

Run from this directory while the disposable MySQL fixture is running:

```text
node regression.mjs
```
