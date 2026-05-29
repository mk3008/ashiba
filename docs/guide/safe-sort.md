---
title: Safe Sort
---

# Safe Sort

Safe sort is Ashiba's boundary for dynamic `ORDER BY`.

Use the name when you want to ask a human or AI to add user-selectable sorting without accepting raw SQL fragments.

```text
Add dynamic sorting with Ashiba safe sort.
```

The important rule is simple:

> Application input chooses a reviewed sort key. It never supplies an `ORDER BY` SQL fragment.

## Why It Exists

Dynamic sorting is tempting to write as string concatenation:

```ts
const sql = `${baseSql} order by ${userInput}`;
```

That is the unsafe shape. A sort key from a request, URL, UI, or AI-generated code should not become SQL text.

Ashiba safe sort instead uses query metadata generated from visible SQL. The driver adapter accepts structured sort input:

```ts
await adapter.execute(
  listUsersQuery,
  {},
  {
    sort: [
      { key: 'email', direction: 'asc' },
    ],
  },
);
```

The adapter renders `ORDER BY` only when the requested key exactly matches the reviewed whitelist recorded in the query model.

## Where Sort Keys Come From

Ashiba analyzes the `SELECT` list during model generation.

```sql
select
  u.user_id as id,
  u.email,
  u.created_at as createdAt
from public.users u
```

This exposes sortable keys such as:

- `id`
- `email`
- `createdAt`

The generated query model records the SQL expression behind each key. Runtime code requests the public key; it does not provide the SQL expression.

## What The Driver Adapter Checks

The PostgreSQL driver adapter checks all of these before rendering dynamic sorting:

- the query has CLI-generated query model metadata
- the SQL source hash still matches the metadata
- the query is a parsed `SELECT`
- the root query is not an unsupported compound query such as root-level `UNION`
- the `ORDER BY` insertion position is resolved
- the requested sort key exactly matches the query model whitelist
- the direction is only `asc` or `desc`
- any explicit runtime sort profile does not introduce SQL outside the query model

If one of those checks fails, Ashiba rejects the request before sending SQL to the database.

## Existing ORDER BY

Safe sort can add a new `ORDER BY` clause when the query does not have one:

```sql
select u.email from public.users u
```

It can also append to an existing top-level `ORDER BY`:

```sql
select u.email from public.users u order by u.created_at
```

In that case, the generated SQL becomes comma-style ordering, such as:

```sql
order by u.created_at, u.email asc
```

For clauses such as `LIMIT`, `OFFSET`, `FETCH`, and `FOR UPDATE`, Ashiba records the insertion point and places the dynamic `ORDER BY` before those clauses.

## Runtime Sort Profile

The generated query model is the maximum allowed sort surface.

You may pass a runtime `sortProfile` to refine defaults, for example a default direction:

```ts
await adapter.execute(
  listUsersQuery,
  {},
  {
    sortProfile: {
      createdAt: {
        sql: 'u.created_at',
        defaultDirection: 'desc',
      },
    },
    sort: [
      { key: 'createdAt' },
    ],
  },
);
```

The `sql` in a runtime profile must match the SQL expression already recorded in the query model. The profile can refine behavior, but it cannot add new sortable SQL expressions at runtime.

## Unsupported Shapes

Root compound queries are not safe-sort targets:

```sql
select id, email from active_users
union all
select id, email from archived_users
```

Wrap the compound query and expose stable sortable columns:

```sql
select q.id, q.email
from (
  select id, email from active_users
  union all
  select id, email from archived_users
) q
```

Then regenerate metadata.

## Refresh After SQL Edits

Safe sort depends on generated metadata. If the SQL changes, refresh the query model before relying on dynamic sorting:

```bash
npx ashiba feature query refresh users-list list
npx ashiba check
```

For standalone query contracts:

```bash
npx ashiba model-gen path/to/query.sql --out path/to/query.ts
```

Then run the full gate before review or CI:

```bash
npx ashiba check --full
```

## Boundary

Safe sort does not decide which sorts your product should expose. That remains application logic.

Ashiba's job is narrower: once your application chooses a public sort key, the driver adapter verifies that the key maps to a reviewed SQL expression and renders the `ORDER BY` without accepting raw SQL from the outside.

