# B2 candidate: work-item listing

`listWorkItems(pool, options)` lists rows from the fixture's `work_items` table.
`ownerId` is required; `state` and `limit` are optional. `sort` accepts only
`updatedAt` and `priority`. Any other value safely selects the reviewed
`updatedAt` SQL asset.

Application SQL is in the two `.sql` files next to the code. The function uses
the native `mysql2/promise` driver's named-parameter API (`execute`) and does
not build SQL from runtime values. `createNativePool(config)` enables named
placeholders on a native MySQL pool.

## Verification

From this directory, run:

```text
node --test test/list-work-items.test.js
```

The native-driver regression test is skipped unless `MYSQL_URL` is set to a
MySQL connection configuration and `mysql2` is available to the host runtime.
For example, with the fixture database running:

```text
$env:MYSQL_URL='mysql://user:password@127.0.0.1/database'
$env:TEST_OWNER_ID='1'
node --test test/list-work-items.test.js
```
