# Layered PostgreSQL ticket queue

This reference was generated in a clean room from packed Ashiba packages using
the short prompt in [ORIGINAL_PROMPT.md](./ORIGINAL_PROMPT.md). Canonical SQL
and generated bindings are in the access layer; the application service owns
mapping and transaction behavior; the adapter owns the native `pg` pool.

```bash
pnpm --dir examples/postgres-ticket-queue-layered generate
pnpm --dir examples/postgres-ticket-queue-layered generate:check
pnpm --dir examples/postgres-ticket-queue-layered typecheck
pnpm --dir examples/postgres-ticket-queue-layered test
```

Ashiba does not choose this architecture. It provides deterministic binding
metadata/freshness and named binding while the application keeps its own pool,
transaction, mapping, and finite reviewed sort policy.
