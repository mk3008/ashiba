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

The adapter renders `ORDER BY` only when the requested key exactly matches the reviewed whitelist recorded in the query model. Runtime code does not supply column names or SQL fragments.

## Where Sort Keys Come From

Ashiba analyzes reviewed terms in the top-level `ORDER BY` during model generation. A projected column is not dynamically sortable merely because it appears in `SELECT`.

```sql
select
  u.user_id as id,
  u.email,
  u.created_at as createdAt
from public.users u
order by
  u.created_at desc,
  u.user_id asc
```

This exposes only these finite choices:

- `createdAt desc`
- `id asc`

`email`, `createdAt asc`, and `id desc` are not capabilities of this query. The generated query model records each visible expression and direction. Runtime code selects those public keys; it cannot provide a new SQL expression or direction. Each key may appear at most once in a request, so repetition cannot turn the finite selection surface into an unbounded SQL fragment.

## What The Driver Adapter Checks

The PostgreSQL driver adapter checks all of these before rendering dynamic sorting:

- the query has CLI-generated query model metadata
- the SQL source hash still matches the metadata
- the query is a parsed `SELECT`
- the root query is not an unsupported compound query such as root-level `UNION`
- the `ORDER BY` insertion position is resolved
- the requested sort key exactly matches the query model whitelist
- the direction and expression both occur in the source `ORDER BY`
- any explicit runtime sort profile does not introduce SQL outside the query model

If one of those checks fails, Ashiba rejects the request before sending SQL to the database.

This makes safe sort a finite selection over source-visible behavior, not a general runtime `ORDER BY` builder.

## Source-Visible ORDER BY

Safe sort is unavailable when source SQL has no top-level `ORDER BY`. Add every selectable expression and its allowed direction to the canonical SQL first. Ashiba treats that visible list as the maximum finite sort surface:

```sql
select
  u.user_id as id,
  u.email,
  u.created_at as createdAt
from public.users u
order by u.user_id
limit :limit
offset :offset
```

To make `createdAt desc` selectable, it must also be visible:

```sql
order by
  u.created_at desc,
  u.user_id asc
limit :limit
offset :offset
```

A runtime request for `createdAt desc` can then produce:

```sql
order by u.created_at desc
limit $1
offset $2
```

Ashiba replaces only the reviewed `ORDER BY` list with a selected subset of those exact terms. Every expression and direction in executable SQL is therefore already reviewable in the canonical file. Runtime code cannot introduce an optional JOIN, projection, predicate, identifier, or opposite sort direction. Include an identity term in the runtime selection whenever pagination requires a deterministic tie-breaker.

For clauses such as `LIMIT`, `OFFSET`, `FETCH`, and `FOR UPDATE`, Ashiba records the insertion point and places the dynamic `ORDER BY` before those clauses.

## Runtime Sort Profile

The generated query model is the maximum allowed sort surface.

You may pass a runtime `sortProfile` to refine which already-visible direction is used as the default:

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

The `sql` in a runtime profile must match the SQL expression already recorded in the query model, and its default direction must be one of the source-visible directions. The profile cannot add a sort expression or direction at runtime.

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

Terms with explicit `NULLS FIRST` or `NULLS LAST` are also not exposed yet. Ashiba blocks them instead of dropping the null-placement semantics during finite selection. Keep the source `ORDER BY` unchanged, or use only terms whose complete ordering semantics Ashiba can preserve.

## Refresh After SQL Edits

Safe sort depends on generated metadata and source hashes. If the `.sql` file, generated `query.sql.ts` snapshot, compiled dialect binding, or `query.meta.ts` metadata no longer match, refresh the query model before relying on dynamic sorting:

```bash
npx ashiba check --fix-generated
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
