# Frozen ticket application acceptance

Build a strict TypeScript PostgreSQL ticket application using the supplied DDL.

The application must expose an application-owned API that the runner can call:

```ts
createTicketApplication(pool).listTickets(options)
createTicketApplication(pool).getTicket(id, status?)
createTicketApplication(pool).assignTicket({ ticketId, assigneeId, actorId, failAudit? })
```

`listTickets` supports nullable `status` and `assigneeId` filters, pagination (`limit`, `offset`), and exactly these finite sort pairs: `createdAt.asc`, `createdAt.desc`, `subject.asc`, and `subject.desc`. Each sort must end with a stable `id asc` tie-breaker. Unknown sort keys must be rejected before database execution.

`getTicket` returns the ticket when the optional status is omitted or matches; when supplied and mismatched it returns no ticket.

`assignTicket` updates the ticket and inserts an audit event in one native pg transaction. When `failAudit` is true, it must roll back both operations.

Keep canonical SQL as visible `.sql` files. Use direct `compileNamedParameters()` once at a controlled initialization/startup/module boundary, cache the result, and call `bindNamedParameters()` before native pg. There must be no generated binding module, source hash, freshness lifecycle, Ashiba CLI, ORM, query builder, migration framework, repository abstraction, or Ashiba-specific framework.

Write candidate tests, including missing and unused named parameter rejection and hostile SQL-looking value isolation. The runner will provide a PostgreSQL database and perform independent behavioral checks.
