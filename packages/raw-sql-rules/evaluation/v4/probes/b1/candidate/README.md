# B1 work-item listing

`listWorkItems(connection, options)` executes a visible SQL asset through a native `mysql2` connection.

- `ownerId` is required and must be a safe integer.
- `state` is optional (`open` or `closed`).
- `sort` accepts `updatedAt` or `priority`; any other value safely defaults to `updatedAt`.
- `limit` is optional and, when present, must be a positive safe integer.

The four reviewed SQL assets cover the two allowed orderings and the limited/unlimited forms. Values are bound with `mysql2` named parameters; runtime input never becomes SQL syntax.

Run the unit/integration test with:

```text
node --test list-work-items.test.cjs
```

The database test runs when `MYSQL_URL` is set, or with the local fixture defaults (`mysql://raw_sql_rules:raw_sql_rules@127.0.0.1:33306/raw_sql_rules`).
