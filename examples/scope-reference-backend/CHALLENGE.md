# Support Inbox reference challenge

This challenge is intentionally stable.

Implementation, Ashiba APIs, and internal architecture may evolve.
The business problem and acceptance behavior must not change unless a human explicitly requests a challenge revision.

Build a small PostgreSQL support-ticket queue with visible SQL.

## Required behavior

- List tickets by optional status, customer, and assignee filters. Assignee has
  three application-owned meanings: omitted means no assignee filter, `null`
  means unassigned only, and a value means that assignee only.
- Paginate and accept at most three application-owned ordering keys from
  `priority`, `createdAt`, and `subject`. Priority uses a CASE business order;
  every ordering ends with `id` as a stable tie breaker. Runtime input never
  supplies SQL.
- Get one ticket by id.
- Assign a ticket and write an audit event in the same native PostgreSQL
  transaction. A failed event insert must roll back the ticket update.

The database contains `tickets` and `ticket_events`. Integration tests are the
behavioral oracle: they exercise the three assignee meanings, ordering and
invalid sort input, missing/existing reads, and assignment/rollback behavior.
