# Editing and Review Matrix

This is an edit-shape assessment, not a fabricated fresh-agent benchmark. Token usage and independent-agent success rate are **unavailable**. All listed edits are mechanically feasible; the difference is what must remain aligned.

| Task | Current Ashiba named | pg direct positional | mysql2 driver named | mysql2 anonymous | mssql driver named |
| --- | --- | --- | --- | --- | --- |
| Append parameter | SQL name + object key | SQL `$n` + ordered array | SQL name + object key | SQL `?` + occurrence array | SQL `@name` + `request.input` |
| Insert middle predicate | SQL name; existing callsite order unchanged | renumber later placeholders and array | SQL name; object order irrelevant | shift later occurrences and array | SQL name + registration |
| Delete parameter | binder flags stale object key | renumber/count changes; server rejects count | driver ignores stale object key | array/count maintenance | driver ignores stale registration |
| Reorder predicates | object unchanged | positions/array must stay coupled | object unchanged | occurrence array must stay coupled | registration unchanged |
| Repeat parameter | one logical key | reuse same `$n` deliberately | repeated name works | duplicate occurrence value | repeated name works |
| Rename | SQL and object key; binder rejects one-sided rename | review comment only if supplied; no machine name | SQL and object key | comments only | SQL and `request.input` key |

Representative middle insertion:

```diff
-- Ashiba / driver-named
+ and customer_id = :customer_id
  params.customer_id = customerId

-- pg direct
+ and customer_id = $3
- and status = $3
+ and status = $4
  values = [shopId, customerId, status]
```

AI can perform the latter, but its correctness is a multi-location alignment problem. The live negative controls show that a syntactically aligned but semantically swapped same-type array can execute silently. A non-normative comment such as `-- $2 status` improves review readability but drifts on SQL-only edits and is intentionally not parsed by Ashiba.
