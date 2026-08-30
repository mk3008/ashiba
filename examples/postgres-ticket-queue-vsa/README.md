# Vertical-slice PostgreSQL ticket queue

This strict TypeScript reference was adopted from a clean-room fresh-agent
candidate built from packed Ashiba packages and the short consumer prompt in
[ORIGINAL_PROMPT.md](./ORIGINAL_PROMPT.md). SQL, application-owned startup
bindings, the native `pg` boundary, and tests live with the ticket slice. The isolation-only
[harness prompt](./FRESH_AGENT_HARNESS_PROMPT.txt) is evaluation evidence, not
user guidance.

```bash
pnpm --dir examples/postgres-ticket-queue-vsa typecheck
pnpm --dir examples/postgres-ticket-queue-vsa build
pnpm --dir examples/postgres-ticket-queue-vsa test
```

The application owns its pool, transaction, mapping, finite reviewed sort
policy, and startup compilation cache. Ashiba supplies deterministic named
parameter compilation and binding.
