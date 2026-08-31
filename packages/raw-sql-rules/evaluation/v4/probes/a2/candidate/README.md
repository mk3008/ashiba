# A2 candidate: work-item listing

`listWorkItems` lists rows from the fixture's `work_items` table through a
mysql2-compatible native connection. `ownerId` is required; `state` and
`limit` are optional. `sort` defaults to `updatedAt` and accepts only
`updatedAt` or `priority`; other values are rejected before the driver runs.

The two reviewed sort variants are visible SQL assets under `sql/`. Runtime
values are passed as native positional parameters. The no-limit case binds a
large finite limit because the fixture uses an `INT` primary key and priority;
this avoids constructing SQL at runtime.

Run the unit checks from this directory with:

```sh
node --test list-work-items.test.js
```
