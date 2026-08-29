# Reproduction

From the repository root after `corepack pnpm install --frozen-lockfile` and
`corepack pnpm build`:

```powershell
node docs/evaluations/architecture-fitness-practicality/evaluation/run-binding-negative-controls.mjs
node docs/evaluations/architecture-fitness-practicality/evaluation/ai-trial/verify-shape.mjs
node packages/cli/dist/index.js lint docs/evaluations/architecture-fitness-practicality/evaluation/fixtures/read-changed.sql --ddl-dir docs/evaluations/architecture-fitness-practicality/evaluation/fixtures/ddl
node packages/cli/dist/index.js query uses table public.tickets --root-dir examples/hono-pg-support-inbox --format json
corepack pnpm --filter @ashiba-ts/cli test -- query-uses.test.ts ddl-lint.test.ts ddl-diff.test.ts sql-resource.test.ts
```

Run the live SQL-resource suite only with a disposable PostgreSQL database URL:

```powershell
$env:ASHIBA_TEST_DATABASE_URL='<disposable PostgreSQL URL>'
corepack pnpm --filter @ashiba-ts/cli test -- sql-resource.live.test.ts
```

Ticket Queue's `verify` also needs a disposable `DATABASE_URL`; it resets only
its `tickets` and `ticket_events` tables. Remove those tables after an ad-hoc
evaluation run if the database is shared.
