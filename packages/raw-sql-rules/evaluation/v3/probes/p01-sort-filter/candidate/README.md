# Work-item listing candidate

`listWorkItems(db, input)` accepts an integer `ownerId`, an optional `state`,
and one of the reviewed sort names `updatedAt`, `priority`, or `title`.
Unknown sort names use `updatedAt`. Values are bound as named parameters;
sorting is selected only through the finite `SORT_ASSETS` map.

The function expects a native SQLite-style handle exposing
`db.prepare(sql).all(params)`. Run the executable checks with:

```text
node --test list-work-items.test.js
```
