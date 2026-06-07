# Acceptance: Grid Header Safe Sort

## Functional Acceptance

- The ticket table renders clickable headers for sortable columns.
- A normal header click navigates to a single `grid:` sort value.
- Shift-click appends or toggles the clicked column in the `grid:` sort value.
- Existing preset sort values still work.
- Unknown `grid:` sort keys are discarded before execution.
- Multi-sort is limited to a small, predictable number of keys.
- The compiled SQL inspection shows Ashiba-rendered safe sort expressions, not raw user-provided SQL.
- The SQL-owned stable suffix remains visible as `ticket_id asc`.

## Implementation Acceptance

- `list-tickets.sql` is not changed.
- Header sort keys are defined as an application whitelist.
- The whitelist maps to safe sort keys already present in generated query model metadata.
- Parser coverage proves that unsafe sort keys are dropped.
- Route-level E2E coverage proves that the HTTP route can render a multi-sort request.

## Verification Commands

The reference patch has been verified with:

```powershell
pnpm --dir examples/hono-pg-support-inbox typecheck
$env:ASHIBA_TEST_DB_PORT='55433'; Remove-Item Env:ASHIBA_TEST_DATABASE_URL -ErrorAction SilentlyContinue; pnpm --dir examples/hono-pg-support-inbox test
```

The durable exercise verifier is:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File examples/hono-pg-support-inbox/exercises/grid-header-safe-sort/verify.ps1
```

## Demonstration Value

This exercise should demonstrate that Ashiba lets a list UI gain richer interaction without replacing reviewed SQL with ORM runtime query construction.

The answer patch should stay small enough that a reviewer can see the boundary:

- SQL remains the source asset.
- The route converts user intent into whitelisted safe sort inputs.
- The driver adapter renders the actual `ORDER BY` safely.
- Tests focus on the parser boundary and the HTTP route, not on mocking an ORM builder.
