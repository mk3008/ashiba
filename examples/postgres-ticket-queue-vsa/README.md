# Vertical-slice PostgreSQL ticket queue

This reference was generated in a clean room from packed Ashiba packages using
the short prompt in [ORIGINAL_PROMPT.md](./ORIGINAL_PROMPT.md). SQL, generated
bindings, the native `pg` boundary, and tests live with the ticket slice.

```bash
pnpm --dir examples/postgres-ticket-queue-vsa generate
pnpm --dir examples/postgres-ticket-queue-vsa check:generated
pnpm --dir examples/postgres-ticket-queue-vsa typecheck
pnpm --dir examples/postgres-ticket-queue-vsa test
```

The application owns its pool, transaction, mapping, and finite reviewed sort
policy. Ashiba supplies only metadata generation/freshness and named binding.
