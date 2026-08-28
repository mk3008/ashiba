# Hono PostgreSQL Support Inbox

This is historical dogfooding application code retained for its Hono route,
PostgreSQL, and transaction evidence. Its canonical SQL and application logic
remain readable, but Ashiba no longer owns its feature directory layout,
generated DTOs, mappers, or regeneration commands.

For new work, use the smaller
[PostgreSQL ticket queue reference](../postgres-ticket-queue-reference), which
uses the current Golden Path directly:

```text
canonical SQL → binding metadata → bindNamedParameters → native pg
```

The Support Inbox source remains ordinary application TypeScript. Its SQL logic
proof uses application-owned PostgreSQL and route integration tests. Use
`pnpm check:sql`, `pnpm typecheck`, and application tests; there is no Ashiba
feature-scaffold, metadata-refresh command, or Ashiba testkit for this example.
