# Acceptance: Optional Priority Filter

## Functional Acceptance

- The `/tickets` route accepts `priority=high`, `priority=medium`, and `priority=low`.
- Empty `priority` behaves like no filter.
- `priority=high` returns only high-priority tickets in the seeded demo.
- The SQL inspection panel shows the compressed predicate `t.priority = $1` when the filter is present.
- The SQL inspection panel does not keep the optional guard expression for a present priority value.

## Implementation Acceptance

- `list-tickets.sql` contains the new optional priority condition.
- Generated query metadata includes `priority` in `namedParameters`.
- Optional condition compression metadata includes a `priority` branch.
- Mapper generated assets are refreshed.
- Application request parsing passes `priority` through to `ListTicketsQueryParams`.
- TypeScript boundary files compile.
- Route-level E2E coverage checks the new filter.

## Verification Commands

The reference patch has been verified with:

```powershell
pnpm --dir examples/hono-pg-support-inbox typecheck
$env:ASHIBA_TEST_DB_PORT='55433'; Remove-Item Env:ASHIBA_TEST_DATABASE_URL -ErrorAction SilentlyContinue; pnpm --dir examples/hono-pg-support-inbox test
```
