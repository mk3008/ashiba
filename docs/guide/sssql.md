---
title: SSSQL Notation
---

# SSSQL Notation

SSSQL notation is Ashiba's name for optional-search SQL that stays valid SQL.

Use the name when you want to ask a human or AI to write an optional condition without explaining the full predicate shape every time.

```sql
where (:email is null or u.email = :email)
```

That condition means:

- in the source SQL file, when `:email` is provided, filter by `u.email = :email`
- in the source SQL file, when `:email` is `null`, keep the condition harmless
- keep the SQL readable, reviewable, and runnable in a SQL client

Ashiba keeps this as plain SQL. There is no hidden query DSL and no runtime-only condition builder.

## Shape

The common SSSQL shape is a parenthesized optional predicate:

```sql
(:parameter is null or predicate_using_the_same_parameter)
```

The null guard must be for the same named parameter used by the predicate branch. The predicate branch can use normal SQL syntax, including database-native expressions:

```sql
(:keyword is null or u.email ilike '%' || :keyword || '%')
```

When PostgreSQL needs help inferring a nullable parameter type, the guard can cast that same parameter:

```sql
(cast(:status as text) is null or u.status = :status)
```

Multiple predicate branches are allowed when they all belong to the same optional parameter:

```sql
(
  :keyword is null
  or u.email ilike '%' || :keyword || '%'
  or u.display_name ilike '%' || :keyword || '%'
)
```

Avoid treating SSSQL as a general boolean rewrite language. It is for one optional input parameter and the SQL predicates that should exist only when that parameter has a value.

## How To Ask For It

For AI-assisted work, prefer a short instruction like this:

```text
Add an email filter using Ashiba SSSQL notation.
```

The intended output is ordinary SQL:

```sql
where (:email is null or u.email = :email)
```

The Ashiba command surface uses the descriptive command name `query optional`, but help and docs refer to the notation as SSSQL.

```bash
npx ashiba query optional add path/to/query.sql --filter email
npx ashiba query optional refresh path/to/query.sql
npx ashiba query optional remove path/to/query.sql --parameter email
```

## Compression At Runtime

SSSQL conditions are readable, but leaving every optional branch in the final SQL can be noisy for the database planner. The PostgreSQL driver adapter can compress optional branches at execution time.

For example, when `email` is `null` or `undefined`, Ashiba can remove this branch from the SQL sent to PostgreSQL:

```sql
and (:email is null or u.email = :email)
```

When `email` has a value, Ashiba removes only the null guard and keeps the real predicate:

```sql
and u.email = $1
```

The source SQL file stays unchanged. The generated metadata tells the adapter which ranges can be removed safely.

Compression also repairs the surrounding boolean glue. For example:

```sql
where (:email is null or u.email = :email)
  and u.tenant_id = :tenant_id
```

When `email` is `null`, the SQL sent to PostgreSQL becomes:

```sql
where u.tenant_id = $1
```

If every predicate in a `WHERE` scope is removed, Ashiba removes that `WHERE` clause instead of leaving dangling SQL. CTEs, derived subqueries, and the root query are handled by their own SQL ranges, so an optional branch in one scope does not remove a `WHERE` clause in another scope.

## Default Behavior

Feature scaffolded query sources enable optional-condition compression by default:

```ts
export const listQuery = {
  // ...
  optionalConditionCompression: true,
} as const;
```

The generated PostgreSQL SQL client passes that query setting to the driver adapter:

```ts
optionalConditionCompression:
  query.optionalConditionCompression ?? executeOptions?.optionalConditionCompression
```

So, in normal scaffolded feature code, SSSQL compression is on by default.

At the low-level driver adapter boundary, compression only runs when `optionalConditionCompression: true` is provided. This keeps hand-built adapter calls explicit.

## Controlling Compression

Compression is optional. The default scaffold turns it on for generated feature query sources, but you can change that at the query source or SQL client wiring.

Disable compression for one generated query by editing that query source:

```ts
export const listQuery = {
  // ...
  optionalConditionCompression: false,
} as const;
```

This query-level setting wins over SQL client defaults.

Set a default from your SQL client wiring when the query source does not set its own value:

```ts
createPgSqlClient(pool, {
  executeOptions: {
    optionalConditionCompression: false,
  },
});
```

The generated PostgreSQL client uses this precedence:

```ts
optionalConditionCompression:
  query.optionalConditionCompression ?? executeOptions?.optionalConditionCompression
```

So:

- edit the generated query source when one specific query should opt in or out
- edit `createPgSqlClient(..., { executeOptions })` when you want a default for query sources that leave the setting unset
- pass `{ optionalConditionCompression: true }` when calling the low-level PostgreSQL adapter directly

If a generated query source explicitly sets `optionalConditionCompression: true`, change that query source when you want that specific query to opt out.

## Safety Boundary

Compression depends on generated query metadata. If the SQL changes and metadata becomes stale, Ashiba rejects compression instead of emitting guessed SQL.

The `query optional` commands also use a conservative rewrite plan before writing SQL files. Ashiba writes an SSSQL change only when `rawsql-ts` reports that the edit can be limited to the target optional branch. If the operation would require a full SQL reformat, or if comments and unrelated SQL could be touched, the command stops and asks you to review or edit the SQL manually.

This keeps the rule simple:

- newly scaffolded SQL may be formatted by Ashiba
- existing SQL is not reformatted by `query optional`
- SSSQL commands update only the intended optional branch, or they do not write

Refresh metadata after SQL edits:

```bash
npx ashiba query optional refresh path/to/query.sql
npx ashiba feature query refresh users-list list
```

Then run the passive checks:

```bash
npx ashiba check
npx ashiba check --full
```
