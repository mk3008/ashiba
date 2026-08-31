# A2 work-item listing

`listWorkItems(pool, options)` lists rows owned by the required `ownerId`.
`state` is optional, `sort` accepts `updatedAt` or `priority`, and `limit` is
optional (default `100`, maximum `1000`). Unknown sort values safely use the
`updatedAt` SQL asset. All application SQL is kept in `sql/` and values are
bound by name through the native `mysql2/promise` driver. `pool.query` is used
because MySQL 8.4 rejects a prepared `LIMIT` parameter in this query shape.

```js
import { createPool, listWorkItems } from './index.js';

const pool = createPool();
const rows = await listWorkItems(pool, {
  ownerId: 42,
  state: 'open',
  sort: 'priority',
  limit: 20,
});
await pool.end();
```

Run the local unit/static checks:

```text
node --test test/list_work_items.test.js
```

With the shared MySQL fixture running, include the native-driver check:

```text
RUN_DB_TESTS=1 node --test test/list_work_items.test.js
```
