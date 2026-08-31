# Work-item listing probe

`listWorkItems` lists rows for a required `ownerId`. It accepts an optional
`state` (`open` or `closed`), `sort` (`updatedAt` or `priority`), and positive
integer `limit`. Unknown sort values use the reviewed `updatedAt` SQL asset.

Application SQL is kept in `sql/` and selected from a finite set of complete
assets. Values are bound by name through the `mysql2/promise` native driver.

Run unit tests with:

```text
node --test test/list-work-items.test.js
```

With the shared MySQL fixture running, include the integration check:

```text
RUN_MYSQL_INTEGRATION=1 node --test test/list-work-items.integration.test.js
```
