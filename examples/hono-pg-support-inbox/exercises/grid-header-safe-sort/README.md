# Exercise: Grid Header Safe Sort

## Goal

Add table-header sorting to the Support Inbox list without changing the SQL file.

The demo already exposes business-oriented safe sort presets through the filter form. This exercise asks you to add a more spreadsheet-like interaction:

- Clicking a grid header applies a single sort.
- Shift-clicking another grid header appends that column to the current sort.
- Only reviewed safe sort keys may reach the Ashiba driver adapter.
- The stable `ticket_id asc` suffix stays owned by the SQL file.

## Why This Exercise Exists

This is a product-facing dogfooding task. It should show that a realistic list UI can evolve without turning the visible SQL into a generated query-builder surface.

The expected solution keeps the SQL readable and reviewed, then adds a small user-facing safe sort layer around it.

## Starter State

The starter demo has:

- A `/tickets` route backed by `list-tickets.sql`.
- Safe sort presets such as `action-required`, `priority-high`, and `sla-soon`.
- SQL inspection in the right console panel.
- Route-level E2E coverage for filters, optional condition compression, and preset safe sort choices.

The starter demo does not have sortable table headers.

## Task

Implement a header-sort surface for the ticket grid.

Expected URL shape:

```text
/tickets?sort=grid:customer_name:asc,updated_at:desc
```

Recommended implementation shape:

- Keep the existing preset sort values working.
- Add a separate `grid:` sort value for header-driven sorting.
- Parse `grid:` sort values through a whitelist.
- Drop unknown sort keys before passing anything to the driver adapter.
- Limit the number of grid sort keys to a small number, such as 3.
- Use ordinary links for non-Shift clicks so the UI still works without JavaScript.
- Use a tiny browser script only for Shift-click append/toggle behavior.

Do not edit `list-tickets.sql` for this exercise.

## Files To Inspect

- `src/demo/request.ts`
- `src/demo/render.ts`
- `src/demo/request.test.ts`
- `src/demo/app.e2e.test.ts`
- `src/features/support-inbox/queries/list-tickets/generated/query.meta.ts`

## Solution Patch

The reference solution is stored in:

```text
exercises/grid-header-safe-sort/solution.patch
```

Apply it from the repository root in a disposable worktree:

```powershell
git apply examples/hono-pg-support-inbox/exercises/grid-header-safe-sort/solution.patch
```

The patch is intentionally not applied to the starter demo in this directory.

## Verification

Run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File examples/hono-pg-support-inbox/exercises/grid-header-safe-sort/verify.ps1
```

If the PostgreSQL test database is not already running, pass `-StartDocker`:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File examples/hono-pg-support-inbox/exercises/grid-header-safe-sort/verify.ps1 -StartDocker
```
