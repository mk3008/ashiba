# Exercise: Contract Boundary Narrowing

## Goal

Narrow the generated list-ticket request contract from conservative `unknown` values to an application-owned type.

This exercise shows that Ashiba's generated code is not a sealed compiler artifact. The generated starter can be conservative, and the application team can make the boundary stricter when the domain policy is known.

## Why This Exercise Exists

Generated SQL boundaries may start with `unknown` when Ashiba cannot safely own a PostgreSQL driver policy, expression type, JSON shape, or imported request contract.

That is acceptable only if the project has a clear edit-and-verify loop. This exercise makes that loop explicit:

1. Keep the external adapter input untrusted.
2. Narrow the feature request and query parameter contract.
3. Add runtime validation at the feature input boundary.
4. Keep the SQL and mapper evidence unchanged when the SQL shape did not change.
5. Prove the change with typecheck and feature tests.

## Task

For the `list-tickets` feature, replace the generated request/query parameter `unknown` fields with explicit application-owned types:

```ts
type OptionalTextFilter = string | null;

interface ListTicketsQueryParams {
  status: OptionalTextFilter;
  customerTier: OptionalTextFilter;
  slaState: OptionalTextFilter;
  language: OptionalTextFilter;
  channel: OptionalTextFilter;
  tag: OptionalTextFilter;
  keyword: OptionalTextFilter;
  limit: number;
  offset: number;
}
```

Then make `parseRequest(raw: unknown)` validate the raw boundary before returning this typed request.

## Suggested Work Order

1. Edit `src/features/support-inbox/list-tickets/queries/list-tickets/query.ts`.
2. Edit `src/features/support-inbox/list-tickets/input.ts`.
3. Update `src/features/support-inbox/list-tickets/tests/support-inbox.boundary.test.ts`.
4. Run `pnpm --dir examples/hono-pg-support-inbox typecheck`.
5. Run `pnpm --dir examples/hono-pg-support-inbox test`.

Because this exercise does not change SQL, generated SQL metadata and mapper cases should not need to change. If they do change, review why before accepting the diff.

## Solution Patch

The reference solution is stored in:

```text
exercises/contract-boundary-narrowing/solution.patch
```

Apply it from the repository root in a disposable worktree:

```powershell
git apply examples/hono-pg-support-inbox/exercises/contract-boundary-narrowing/solution.patch
```

## Verification

Run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File examples/hono-pg-support-inbox/exercises/contract-boundary-narrowing/verify.ps1
```
