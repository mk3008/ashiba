# V5 bootstrap candidate

`regression.mjs` is the reusable database-backed regression path. It loads the
candidate SQL assets and canonical fixture DDL, connects directly with native
`mysql2/promise` using named placeholders, inserts one fixture row in a
transaction, executes `list-work-items.sql`, and checks representative values
and runtime result types before rolling back.

Run from this directory:

```text
node regression.mjs
```

The disposable MySQL 8.4 fixture is expected at `127.0.0.1:33306` with
database, user, and password all set to `raw_sql_rules`.
