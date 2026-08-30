# Frozen business acceptance

The existing PostgreSQL schema is in `schema.sql`.

Implement a ticket feature with feature-local SQL, generated bindings, query
integration, and application code.

- List tickets with nullable `status` and `assigneeId` filters, a joined audit
  count, multiple result columns, `limit`/`offset`, and exactly these finite
  reviewed sorts: `createdAt` or `subject`, each ascending or descending, with
  `id` as a stable tie-breaker.
- Get one ticket by id.
- Assign a ticket and insert an audit event in one native `pg` transaction.
  An injected audit failure must roll back the assignment.
- A hostile SQL-looking filter value must be bound as a parameter rather than
  concatenated into SQL.
- Demonstrate binder missing-parameter and unused-parameter rejection.
