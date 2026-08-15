# ORM Comparison: Support Inbox List

This note compares the Support Inbox list demo with current Prisma, Drizzle, and sqlc approaches.

Checked on 2026-06-07:

- Prisma ORM / `@prisma/client`: 7.8.0
- Drizzle ORM: 0.45.2
- Drizzle Kit: 0.31.10
- sqlc: 1.31.1

The comparison is intentionally direct. The point is not to make other tools look weak. The point is to ask what happens to this exact demo requirement:

- one reviewable SQL query for the list
- optional filters
- preset safe sort
- grid-header multi-sort
- stable paging order
- visible final SQL and bound parameters
- generated TypeScript support around the SQL

## Baseline: What Ashiba Shows Here

Ashiba keeps `list-tickets.sql` as the owned artifact.

The SQL contains the full shape of the list:

- CTEs
- joins
- selected columns
- optional predicates
- business sort expressions
- stable suffix sort
- limit and offset

At request time, the PostgreSQL driver adapter applies two controlled transformations:

- optional-condition compression
- safe sort insertion

That means the UI can expose dynamic filters and dynamic sort without turning the list query into a TypeScript query-construction program.

Ashiba also has a "code is yours" boundary. Generated code is meant to become application-owned code, not untouchable compiler output. Ashiba therefore does not claim total responsibility for every future edit to generated files.

That does not mean the code is abandoned after generation. The workflow relies on query metadata, deterministic contract checks, selected SQL logic tests, and route-level tests to make unsafe or incomplete changes visible. The ownership model is customer-owned code with mechanical guardrails, not compiler-owned code and not untracked copy-paste.

The strongest point is review shape:

```text
The reviewer can still inspect one SQL file and one final compiled SQL statement.
```

The weakest point is scope:

```text
Ashiba is not a full ORM ecosystem. It does not replace mature migration studios, schema designers, or broad CRUD convenience APIs.
```

There is also a product responsibility tradeoff:

```text
Because Ashiba accepts a narrow runtime adapter responsibility, its optional-compression and safe-sort control surface must stay visible, testable, and reviewable.
```

If that adapter behavior becomes opaque, Ashiba loses the very advantage this demo is trying to show.

## If This Were Prisma

The strongest current Prisma answer is not old-style Prisma Client query objects alone. It is Prisma Client plus TypedSQL.

TypedSQL lets a team write SQL in `.sql` files and generate type-safe Prisma Client functions. That is a serious improvement over treating raw SQL as anonymous strings. For a query like Support Inbox, Prisma TypedSQL would preserve much of the "SQL as artifact" story.

A Prisma implementation would likely look like this:

```text
prisma/sql/listTickets.sql
prisma generate --sql
prisma.$queryRawTyped(listTickets(...args))
```

For fixed filters and fixed sort presets, this is a good fit.

Where Prisma becomes weaker for this demo is UI-driven query shape.

Prisma TypedSQL supports parameterized SQL, but its own documentation says dynamic columns are not natively supported by TypedSQL and require `$queryRaw` / `$executeRaw`, with the usual security and type-safety tradeoffs. The Support Inbox demo does not need dynamic selected columns, but the same category of problem appears in another place: the UI is choosing part of the `ORDER BY` shape at runtime.

That is the real comparison point. The challenge is not only "dynamic columns." It is UI-driven query shape: optional predicates, user-selectable sort expressions, multi-sort, and stable paging order while preserving one reviewable SQL artifact.

A fair Prisma solution would probably choose one of these:

1. Keep a small number of sort variants as explicit SQL files.
2. Put `CASE`-based sort logic into SQL.
3. Use `$queryRaw` with a carefully whitelisted `ORDER BY` fragment.
4. Move the list into Prisma Client / query builder style and give up the single SQL artifact.

None of those is ridiculous. But each has a cost:

- multiple SQL files fragment the review surface
- `CASE` sort SQL can become unnatural and harder for the DB planner/reviewer
- raw `ORDER BY` fragments require application-owned safety discipline
- Prisma Client query construction moves the reviewer away from the actual SQL shape

So the honest conclusion is:

```text
Prisma TypedSQL is the closest TypeScript ORM-side answer to Ashiba for fixed SQL.
Ashiba is more focused when the query is SQL-owned but request-time optional filters and safe sort still need to be dynamic.
```

Choose Prisma if the team wants the Prisma ecosystem, Prisma schema, Prisma Client API, and a mature ORM workflow more than it wants Ashiba's SQL-first list-query review shape.

Choose Ashiba if this list screen is the kind of code the team wants to review as SQL, tune as SQL, and keep as SQL while still exposing dynamic UI behavior safely.

## If This Were Drizzle

Drizzle is a strong TypeScript SQL-like toolkit. For this demo, it has a very credible implementation path.

The current Drizzle approach would likely use:

- Drizzle schema
- `select().from().leftJoin()`
- conditional `where` composition
- `.$dynamic()` for reusable dynamic query modifications
- `orderBy()` with a whitelist mapping
- Drizzle SQL template fragments for expressions that are easier to write as SQL

This is not a bad solution. In fact, for many TypeScript teams, it may be the most ergonomic solution.

The code could model each optional filter as a TypeScript condition, collect them, and apply them with `and(...)`. Sort options could map UI keys to Drizzle column/expression objects. Pagination is straightforward.

The advantage is dynamic query construction:

```text
The dynamic behavior lives naturally in TypeScript.
```

The drawback is the asset boundary:

```text
The query is no longer primarily reviewed as one SQL artifact.
```

Drizzle can show generated SQL, and Drizzle's SQL template operator is flexible. But the source of truth becomes a composition of TypeScript calls and SQL snippets. For a small query, that is fine. For this Support Inbox query, the reviewer has to reconstruct the query from:

- selected fields
- joins
- conditional filter assembly
- helper functions
- sort whitelist
- raw SQL expressions
- pagination helper

That may be a perfectly acceptable engineering tradeoff. But it is not the same review experience.

The sharp comparison is:

```text
Drizzle makes dynamic query construction pleasant.
Ashiba treats the SQL as the asset, then permits controlled dynamism around it.
```

That is the cleanest distinction:

```text
Drizzle: dynamic query construction.
Ashiba: SQL asset with controlled dynamism.
```

Choose Drizzle if the team wants a TypeScript-first query toolkit and is comfortable reviewing query logic through TypeScript composition.

Choose Ashiba if the team expects the review conversation to end with "show me the SQL" and wants the checked-in SQL file to remain the main artifact.

## If This Were sqlc

sqlc is philosophically closest to Ashiba.

It starts from SQL files, analyzes schema and queries, and generates typed code. That is exactly the family Ashiba belongs to, much more than traditional ORM design.

For a fixed Support Inbox query, sqlc is excellent:

- SQL remains real SQL
- generated code is straightforward
- no ORM runtime query builder is needed
- transaction integration is explicit
- database-backed analysis exists for harder PostgreSQL inference

The main difference is runtime dynamism.

sqlc's model is compile SQL to generated code. It does have macros such as `sqlc.arg`, `sqlc.narg`, and `sqlc.slice`, and `sqlc.slice` can dynamically expand an `IN` list for drivers that need it. But general optional-filter compression and safe `ORDER BY` insertion are not the center of sqlc's model.

For this demo, sqlc would likely use one of these approaches:

1. Keep nullable optional predicates in the SQL:

   ```sql
   where (sqlc.narg(status)::text is null or t.status = sqlc.narg(status))
   ```

2. Create several query variants.
3. Write application code that builds SQL fragments outside sqlc.

Again, none of these is invalid.

But the pain is different in each option:

- nullable predicates keep the SQL static, but they also keep optional guards in the executed SQL and can make the final query less natural than the predicate the DB would otherwise receive
- query variants keep every query compiled, but they split the review artifact and can multiply quickly as filters and sort combinations grow
- external SQL building can express the UI behavior, but safety moves outside sqlc and into application-owned whitelist/string-composition discipline

A fourth option is to add a separate query builder layer for list screens. That can work, but at that point the list is no longer just compiled SQL. The team is mixing sqlc's strongest model with another query-construction model.

The sharp comparison is:

```text
sqlc gives ownership of SQL to the developer.
Ashiba gives ownership of the generated application-side code to the customer and adds a narrow driver-adapter layer for safe optional filters and safe sort.
```

That last point matters for Ashiba's position.

Ashiba intentionally did not become a pure compile-only tool. It allows a small runtime adapter responsibility because real list screens often need optional conditions and user-selectable ordering. Without that, teams quickly fall back to either SQL tricks or application-side SQL construction.

Choose sqlc if the stack is Go-first, the queries are mostly fixed, and compile-time generated access methods are exactly what the team wants.

Choose Ashiba if the team wants the sqlc-like SQL ownership idea in a TypeScript web app, but also wants optional-filter compression and safe sort as first-class list-screen mechanics.

## Summary Table

| Tool | Best current answer for this demo | Strong point | Weak point for this demo |
| --- | --- | --- | --- |
| Prisma | TypedSQL plus Prisma Client, or Prisma Client query construction for more dynamic parts | Mature ORM ecosystem and type-safe SQL files via TypedSQL | UI-driven `ORDER BY` / query-shape changes tend to require variants, raw fragments, or moving away from one SQL artifact |
| Drizzle | TypeScript query builder with `.$dynamic()`, whitelisted `orderBy`, and SQL template fragments | Excellent TypeScript-first dynamic query construction | Review surface becomes TypeScript composition rather than one SQL asset with controlled dynamism |
| sqlc | SQL file compiled to typed code, nullable predicates, query variants, or external SQL building for optional behavior | Closest SQL-first philosophy; generated code with no ORM runtime builder | Nullable predicates, variants, and external SQL building each have a distinct cost for dynamic list screens |
| Ashiba | One SQL file plus optional-condition compression and safe sort in the driver adapter | SQL stays reviewable while request behavior stays dynamic; generated code is customer-owned but guarded by drift checks/tests | Narrower ecosystem, plus a narrow adapter control surface that must remain visible and well-tested |

## Bottom Line

If the goal is simply "build the list screen," all four can do it.

If the goal is "make the dynamic list screen pleasant to implement in TypeScript," Drizzle is very strong.

If the goal is "stay inside a mature ORM platform," Prisma is very strong, especially with TypedSQL.

If the goal is "compile SQL into typed access code," sqlc is the established reference point.

Ashiba's claim is narrower:

```text
For SQL-oriented TypeScript teams, a complex read screen should not have to choose between static SQL and dynamic UI behavior.
```

The Support Inbox demo exists to show that the SQL can remain the artifact while optional filters and safe sort remain practical.

## Sources Checked

- Prisma TypedSQL documentation: https://docs.prisma.io/docs/orm/prisma-client/using-raw-sql/typedsql
- Drizzle dynamic query building: https://orm.drizzle.team/docs/dynamic-query-building
- Drizzle SQL template operator: https://orm.drizzle.team/docs/sql
- sqlc generate documentation: https://docs.sqlc.dev/en/latest/howto/generate.html
- sqlc macros documentation: https://docs.sqlc.dev/en/stable/reference/macros.html
- sqlc retrieving rows documentation: https://docs.sqlc.dev/en/stable/howto/select.html
