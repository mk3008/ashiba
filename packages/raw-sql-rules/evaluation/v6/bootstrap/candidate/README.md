# V6 bootstrap candidate

`list-work-items.mjs` loads the application SQL asset and executes it through
the native `mysql2/promise` API with named parameters. `regression.mjs` applies
the canonical v5 fixture DDL, seeds one row in a transaction, checks returned
values and MySQL runtime types, and rolls the transaction back.

Run from this directory while the disposable MySQL 8.4 fixture is available:

```text
node regression.mjs
```
