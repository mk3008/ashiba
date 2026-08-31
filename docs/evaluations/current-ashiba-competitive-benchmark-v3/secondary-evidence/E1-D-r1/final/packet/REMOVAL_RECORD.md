# E1-D treatment-removal record

## Removed

- `drizzle-orm` from the application dependency set and lockfile.
- `drizzle-kit` from the development dependency set and lockfile.
- Drizzle imports, table declarations, predicate/order helpers, and transaction API calls.
- The pre-existing `dist` output, which was generated from the removed treatment and is not part of the source manifest. It was replaced with fresh output from the native `pg` source.

## Replaced

- Application persistence now uses `pg` `Pool`/`PoolClient` calls with parameterized business SQL.
- The assignment operation now uses explicit `BEGIN`, `COMMIT`, and rollback-on-error handling around the update and audit insert.

## Command used for source lockfile state

```text
npm install --package-lock-only --ignore-scripts
npm run build
```

No ORM/query-builder/generator configuration or compatibility wrapper remains.
