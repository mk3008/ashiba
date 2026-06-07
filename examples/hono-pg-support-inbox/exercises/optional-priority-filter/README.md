# Exercise: Optional Priority Filter

## Goal

Add a `priority` optional filter to the ticket list.

This exercise shows the backend-first path for adding a new dynamic filter:

1. Add one optional condition to the SQL.
2. Refresh Ashiba query metadata.
3. Refresh mapper test assets.
4. Let TypeScript show the application boundary updates.
5. Add the UI select and route-level coverage.

## Why This Exercise Exists

The demo already has optional filters and dynamic safe sort. This task makes the learner add one more filter and see that the backend work is mostly mechanical.

The important experience is that the SQL remains ordinary SQL. Ashiba tracks the parameter, metadata, optional-condition compression, and mapper probes around it.

## Task

Add a filter:

```text
priority = high | medium | low
```

Expected URL:

```text
/tickets?priority=high&sort=action-required
```

Expected SQL source change:

```sql
and (cast(:priority as text) is null or t.priority = :priority)
```

## Suggested Work Order

1. Edit `list-tickets.sql`.
2. Run `pnpm ashiba:generate`.
3. Run `node node_modules/@ashiba-ts/cli/dist/index.js feature tests check --fix support-inbox list-tickets`.
4. Run `pnpm typecheck` and follow the remaining application-boundary errors.
5. Add the filter to the web adapter request parser and UI:
   `src/adapters/web/modules/support-inbox/tickets/request/tickets.request.ts`
   `src/adapters/web/modules/support-inbox/tickets/view/tickets.page.ts`
6. Update feature boundary files when typecheck points there, such as `src/features/support-inbox/input.ts`.
7. Add route-level E2E coverage in `src/adapters/web/modules/support-inbox/tickets/route/tickets.route.e2e.test.ts`.

## Solution Patch

The reference solution is stored in:

```text
exercises/optional-priority-filter/solution.patch
```

Apply it from the repository root in a disposable worktree:

```powershell
git apply examples/hono-pg-support-inbox/exercises/optional-priority-filter/solution.patch
```

## Verification

Run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File examples/hono-pg-support-inbox/exercises/optional-priority-filter/verify.ps1
```
