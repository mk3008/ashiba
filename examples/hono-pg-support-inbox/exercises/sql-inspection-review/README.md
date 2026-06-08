# Exercise: SQL Inspection Review

## Goal

Review the Support Inbox demo through the live SQL console and explain Ashiba's core value without changing code.

This is an observation exercise, not an implementation task.

## Review Focus

At minimum, the review should call out these points:

- Dynamic filters, preset safe sort, and grid-header dynamic safe sort do not require rewriting the SQL for each request.
- The SQL remains visible enough to understand the whole query at once.
- The SQL is still SQL. With a client that supports named parameters or compatible parameter binding, the query can be inspected and exercised as SQL.

## What To Open

Run the demo and open:

```text
/tickets
```

Then try:

```text
/tickets?status=open&sort=action-required
/tickets?keyword=ログイン&sort=action-required
/tickets?slaState=breached&sort=sla-soon
/tickets?customerTier=vip&tag=login&sort=vip-first
/tickets?sort=customer_name.asc,updated_at.desc
```

Keep the right-side query console visible.

## Questions

Answer these questions as if you were reviewing whether Ashiba is useful for a real web application:

- What parts of the SQL stay stable across requests?
- Which optional conditions disappear when their parameter is empty?
- When a parameter is present, does the SQL keep the natural predicate form such as `t.status = $1`?
- Where are preset safe sort and grid-header safe sort inserted?
- Does the final `order by t.ticket_id` stable suffix remain visible?
- Could a SQL-oriented reviewer still understand joins, CTEs, filters, and ordering from one query?
- What would be harder to review if the same behavior were expressed only as a TypeScript query builder chain?

## Expected Outcome

The learner should be able to say:

Ashiba keeps the application-owned SQL visible and reviewable, while the driver adapter safely applies optional filters and safe sort at execution time.

The point is not that the UI is complex. The point is that the SQL remains a stable asset even while the request surface is dynamic.

## ORM Comparison Reading

After the SQL console review, read:

```text
exercises/sql-inspection-review/orm-comparison.md
```

It compares the same list screen against current Prisma, Drizzle, and sqlc approaches.
