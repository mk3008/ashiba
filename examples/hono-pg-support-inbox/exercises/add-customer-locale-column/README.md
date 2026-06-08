# Exercise: Add Customer Locale Column

## Goal

Add `customer_locale` to the ticket list.

This exercise shows the path for a SQL-owned list column change:

1. Edit SQL by hand.
2. Refresh Ashiba query metadata.
3. Refresh mapper test assets.
4. Let TypeScript and tests reveal DTO and boundary mapping work.
5. Render the new column in the UI.

## Why This Exercise Exists

Column additions are a common web application change. The point is not that Ashiba edits the SQL for you.

The point is that SQL remains the human-owned source, while Ashiba helps the surrounding generated metadata, mapper probes, and type boundaries catch the required follow-up work.

## Task

Expose customer locale in the list.

Expected SQL source change:

```sql
c.locale as customer_locale
```

Expected UI label:

```text
顧客ロケール
```

## Suggested Work Order

1. Add `c.locale as customer_locale` to `list-tickets.sql`.
2. Run `pnpm ashiba:generate`.
3. Run `node node_modules/@ashiba-ts/cli/dist/index.js feature tests check --fix support-inbox list-tickets`.
4. Run `pnpm typecheck`.
5. Update `ListTicketsQueryResult`, feature output projection, and boundary fixtures where typecheck/test points.
6. Render the new column in `src/adapters/web/modules/support-inbox/tickets/view/tickets.page.ts`.
7. Add the column to the web adapter's header safe-sort whitelist when it should be sortable.
8. Add route-level coverage that the header appears.

## Solution Patch

The reference solution is stored in:

```text
exercises/add-customer-locale-column/solution.patch
```

Apply it from the repository root in a disposable worktree:

```powershell
git apply examples/hono-pg-support-inbox/exercises/add-customer-locale-column/solution.patch
```

## Verification

Run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File examples/hono-pg-support-inbox/exercises/add-customer-locale-column/verify.ps1
```
