---
title: SSSQL Notation
---

# SSSQL Notation

> **Status: current/legacy implementation documentation.** This page documents
> existing Ashiba implementation behavior and historical terminology. It is not
> the normative product boundary. For the preferred product direction, see
> [Ashiba Scope](../design/ashiba-scope.md). In particular, “SSSQL” is not
> required vocabulary, and optional-condition subtraction is an opt-in
> performance optimization rather than a default application semantic.

SSSQL is an existing Ashiba name for optional-search SQL that stays valid SQL.
Prefer the general terms *optional condition*, *optional predicate*, or
*optional-condition subtraction* when no current implementation surface needs
to be named.

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

Ashiba recognizes these null-guard forms as the same SSSQL guard:

```sql
(:status is null or u.status = :status)
(:status::text is null or u.status = :status)
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

## Current Implementation Terminology

When referring to this implementation's CLI and metadata, “SSSQL” is a
descriptive historical term. It is not an instruction for humans or AI to use
as a required Ashiba-specific vocabulary. For example, an ordinary optional
condition can be written as:

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

SSSQL conditions are readable, but leaving every optional branch in the final SQL can be noisy for the database planner. The PostgreSQL driver adapter can compress optional branches at execution time when CLI-generated metadata proves which ranges are safe to rewrite.

For example, when `email` is `null` or `undefined`, Ashiba can remove this branch from the SQL sent to PostgreSQL:

```sql
and (:email is null or u.email = :email)
```

When `email` has a value, Ashiba removes only the null guard and keeps the real predicate:

```sql
and u.email = $1
```

The source SQL file stays unchanged. The generated metadata tells the adapter which ranges can be removed safely. Runtime code does not supply SQL fragments or boolean-expression strings.

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

## Current Implementation Behavior

An application may explicitly opt into optional-condition compression when it
uses the optional adapter path:

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

This is an application choice; the Golden Path does not require it.

At the low-level driver adapter boundary, compression only runs when `optionalConditionCompression: true` is provided. This keeps hand-built adapter calls explicit.

## Canonical Scope Direction

The canonical Scope treats optional input meaning as application-owned.
Optional-condition subtraction is a performance optimization: it is default
off, requires explicit query opt-in, and has an execution-level off escape
hatch. Aligning current implementation defaults with that direction is a
follow-up task; this page does not redefine what existing scaffolds do.

## Controlling Current Implementation Compression

Compression is optional and can be changed at the application query source or
SQL client wiring.

Disable compression for one application query by editing that query source:

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
- pass `{ optionalConditionCompression: true }` when calling `preparePostgresQuery` before your native PostgreSQL client directly

If a generated query source explicitly sets `optionalConditionCompression: true`, change that query source when you want that specific query to opt out.

## Safety Boundary

Compression depends on generated query metadata and source hashes. If the `.sql` file, generated `query.sql.ts` snapshot, compiled dialect binding, or `query.meta.ts` metadata no longer match, Ashiba rejects compression instead of emitting guessed SQL.

This makes the current implementation's optional-condition subtraction a
metadata-backed allowed runtime rewrite, not a general runtime SQL builder.

The `query optional` commands also use a conservative rewrite plan before writing SQL files. Ashiba writes an SSSQL change only when `rawsql-ts` reports that the edit can be limited to the target optional branch. If the operation would require a full SQL reformat, or if comments and unrelated SQL could be touched, the command stops and asks you to review or edit the SQL manually.

This keeps the rule simple:

- newly scaffolded SQL may be formatted by Ashiba
- existing SQL is not reformatted by `query optional`
- SSSQL commands update only the intended optional branch, or they do not write

Refresh metadata after SQL edits:

```bash
npx ashiba query optional refresh path/to/query.sql
npx ashiba check --fix-generated
```

Then run the passive checks:

```bash
npx ashiba check
npx ashiba check --full
```
