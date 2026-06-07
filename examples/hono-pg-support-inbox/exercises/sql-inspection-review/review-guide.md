# Review Guide: SQL Inspection

## Strong Answer

A strong review should notice that the SQL console is not just a debug log. It is the product demonstration.

The visible query still shows:

- CTEs for latest message and last customer reply.
- Joins from tickets to customers, messages, replies, and tags.
- Optional filters as normal SQL predicates after compression.
- Preset safe sort or grid-header safe sort inserted into `order by`.
- The fixed stable suffix `t.ticket_id`.

## Key Value Statement

Dynamic filters, preset sort, and grid-header multi-sort are request-level behavior. They do not force the team to abandon a stable SQL file.

Ashiba keeps the query reviewable as SQL and moves only the mechanical adaptation into the driver adapter.

## Things To Notice

When a filter is empty, the optional branch is removed.

When a filter is present, the compiled SQL should contain the real predicate, for example:

```sql
t.status = $1
```

It should not keep the original optional guard shape:

```sql
cast($1 as text) is null or t.status = $2
```

Safe sort should appear as reviewed SQL expressions, not raw request text. For example, a request such as `sort=customer_name.asc,updated_at.desc` should compile to expressions like `c.name asc, t.updated_at desc`, followed by the stable suffix.

The stable suffix remains in the SQL file:

```sql
order by t.ticket_id
```

## Review Boundary

This exercise does not ask the learner to change code.

The expected skill is reading the SQL inspection panel and explaining why the SQL is still the main artifact even though the UI exposes dynamic filters and sort choices.
