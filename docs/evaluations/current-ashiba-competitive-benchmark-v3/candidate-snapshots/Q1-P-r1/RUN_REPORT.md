# Q1-P-r1 run report

## Prisma path

The main and only database path is Prisma 8 RC's `postgres(...)` runtime from
`@prisma/orm-postgres/runtime`. This candidate uses the documented
`db.raw.sql` whole-query escape hatch because the frozen PostgreSQL work needs
CTEs, a window function, array containment, a schema-qualified enum cast, and
an explicit `EXPLAIN (FORMAT JSON)` statement. No application code imports or
constructs a native `pg` client.

`requestedTag` and `tier` are template interpolations and are bound by the
Prisma raw lane. The runtime schema is an identifier, which PostgreSQL cannot
bind; it is therefore double-quoted before becoming SQL syntax.

## Verification

- `npm run typecheck` passed.
- `npm run build` passed.
- A built-ESM lifecycle probe passed: `close()` is idempotent and a later
  `investigate()` rejects with `APPLICATION_CLOSED` without opening a database
  connection.

## Limit

No database URL was supplied or read, so execution against a live nonce schema
and the resulting PostgreSQL plan are left to the evaluator.
