# A1 candidate: work-item listing

`listWorkItems` requires `ownerId`, accepts an optional `state` and positive `limit`, and supports only `updatedAt` and `priority` ordering. An unknown sort value is mapped to the safe `updatedAt` default.

Application SQL is kept in the two visible assets next to the module. The unlimited and limited statements are complete reviewed assets; the application selects one based on the optional limit. Values are passed as named parameters to the native `mysql2` driver's `execute` method. `createWorkItemPool` enables mysql2 named placeholders and leaves connection lifecycle ownership to the caller.

Run the unit checks from this directory with:

```text
node --test list-work-items.test.mjs
```

The tests exercise validation, asset selection, parameter binding, and safe handling of an unknown sort. A database-backed test should run the assets against the v4 fixture's MySQL-compatible database when that fixture is provisioned.
