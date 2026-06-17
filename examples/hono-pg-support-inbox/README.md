# Ashiba Hono PostgreSQL Support Inbox Demo

This example is a read-heavy web application demo for Ashiba with small Create and optimistic Update flows.

It shows a support inbox built with Hono, PostgreSQL, `pg`, Ashiba feature query boundaries, optional-condition compression, safe sort, mapper tests, and drift checks.

The goal is not to prove every CRUD path. The main demo focuses on the `R` side: a real list screen where SQL remains visible, reviewable, and directly runnable while TypeScript support is generated around it. Small ticket registration and status-update flows are included to show that mutation boundaries can also stay visible, generated, mapper-tested, optimistic-lock aware, and transaction-owned by the application.

## What This Demo Shows

- `GET /tickets` renders a practical support inbox list.
- `GET /tickets/new` and `POST /tickets` create a ticket plus its first message through visible `INSERT ... RETURNING` SQL.
- The Create flow composes two generated mutation query boundaries inside the application-owned `withPgTransaction` helper.
- `POST /tickets/:ticketId/status` updates ticket status through visible optimistic-concurrency SQL.
- The Update flow uses `version_key` as a configured optimistic-lock column: the SQL checks `version_key = :expected_version_key`, increments `version_key`, and treats zero updated rows as a conflict.
- Filters are passed as SQL parameters and handled by Ashiba optional-condition compression.
- The list SQL applies source-proximal filtering: ticket, customer, and tag scope are narrowed before latest-message lookup, customer-reply aggregation, and tag aggregation.
- Keyword search stays in a PostgreSQL-natural SSSQL shape such as `(:keyword is null or subject ilike '%' || :keyword || '%')`; when `keyword` is present, the adapter executes the predicate without the null guard.
- Sort choices are mapped to reviewed safe sort keys from the generated query model.
- The page shows a user-facing safe sort whitelist and a SQL inspection panel with compiled SQL and bound parameter names.
- The main list logic remains in one visible SQL file.
- SQL, query metadata, mapper test assets, and DB-backed tests live beside the feature query.
- Hono and `pg` stay application-owned; Ashiba does not become an ORM runtime path.

## Mutation Test Boundaries

Ashiba supports CUD query boundaries, but the demo separates what each test layer claims to prove.

Generated mapper tests prove the DB-to-TypeScript contract. For `INSERT ... RETURNING`, `UPDATE ... RETURNING`, and `DELETE ... RETURNING`, they verify that representative DB result rows can map into the generated DTO shape.

They do not replace mutation semantics tests. The TypeScript-to-DB path, affected rows, database state changes, transaction behavior, constraints, defaults, triggers, and read-after-write behavior are workflow concerns. Test those with route-level or integration tests that execute against PostgreSQL.

In this demo:

- `create-ticket` and `create-ticket-message` generated mapper tests cover the `RETURNING` result DTOs.
- `POST /tickets` route tests cover the Create workflow: the application-owned transaction runs two inserts, and the created ticket appears through the existing list/detail read path.
- `withPgTransaction` is starter-owned application code. Ashiba query boundaries can run inside it, but Ashiba does not own transaction policy.

## Header And Detail Create Pattern

The Create flow is also a scaffold recipe for a common header/detail mutation.

In this demo, `support-inbox` is a subsystem feature root, not a single feature. The header row is `tickets` and the first detail row is `ticket_messages`. They are separate SQL assets and separate generated query boundaries inside the `create-ticket` feature:

```text
src/features/support-inbox/create-ticket/queries/create-ticket/create-ticket.sql
src/features/support-inbox/create-ticket/queries/create-ticket-message/create-ticket-message.sql
```

The boundaries can be added to the `create-ticket` feature with `feature query scaffold`:

```sh
npx ashiba feature query scaffold create-ticket create-ticket --table tickets --action insert
npx ashiba feature query scaffold create-ticket create-ticket-message --table ticket_messages --action insert
```

If a mutation only needs the primary key from `RETURNING`, use `--returning minimal` when scaffolding:

```sh
npx ashiba feature query scaffold create-ticket create-ticket --table tickets --action insert --returning minimal
```

After editing the generated SQL, refresh metadata and mapper fixtures for each query boundary:

```sh
npx ashiba feature query refresh create-ticket create-ticket
npx ashiba feature query refresh create-ticket create-ticket-message
npx ashiba feature tests check create-ticket --query create-ticket --fix
npx ashiba feature tests check create-ticket --query create-ticket-message --fix
```

The workflow code then composes the generated boundaries with normal application code. This demo keeps a verbose application-owned feature shell around the generated SQL boundaries because it is a realistic web application, not only a default scaffold snapshot. The workflow validates the input, looks up the selected customer, inserts the ticket header, inserts the first message detail, and returns the new ticket id. The web route owns HTTP parsing, redirect/error rendering, and the transaction scope.

This is the point of the pattern: Ashiba does not hide the mutation behind an ORM runtime, but the repetitive SQL boundary, mapper fixture, metadata, and drift-check work can still be scaffolded.

## Optimistic Update Pattern

The status update flow shows the complementary mutation pattern: a user edits a row that may have changed since the page was rendered.

The demo config declares a conventional lock column:

```json
{
  "mutation": {
    "optimisticLock": {
      "versionColumn": "version_key",
      "scaffold": "when-column-exists"
    }
  }
}
```

The visible SQL keeps the concurrency rule reviewable:

```sql
update public.tickets
set
    status = :status
    , updated_at = :updated_at
    , version_key = version_key + 1
where
    ticket_id = :ticket_id
    and version_key = :expected_version_key
returning
    ticket_id
    , status
    , updated_at
    , version_key;
```

The generated query boundary returns zero rows when the expected version is stale. Application-owned workflow code converts that into `OptimisticConcurrencyConflict`, and the route returns `409`.

## Transaction Composition

Ashiba query boundaries do not begin, commit, or roll back transactions by themselves. Keep transaction policy at the application or adapter boundary.

The Create flow uses this shape:

```ts
await withPgTransaction(pool, async (executor) => {
  const result = await executeCreateTicket(executor, body);
  return result;
});
```

Inside the `create-ticket` workflow, the same `FeatureQueryExecutor` is passed to both mutation query boundaries:

```text
create-ticket
create-ticket-message
```

Because both calls share the same borrowed PostgreSQL client, they commit or roll back together. The route-level tests verify both the successful persisted state and the rollback path when the second insert fails.

This is intentional: Ashiba keeps SQL boundaries generated and reviewable, while customer-owned application code decides where transactions start, which isolation level to use, and how workflow failures should be reported.

## RFBA Inspection

Ashiba's default scaffold is now SQL-first: `query.sql`, editable TypeScript support, generated metadata, and DB-backed tests are the primary review targets.

This demo intentionally adds an application-owned shell around some query boundaries:

```text
boundary.ts  -> exposes execute as the feature entrypoint
input.ts     -> parses and normalizes caller input
workflow.ts  -> composes query boundaries through injectable Queries
output.ts    -> shapes the caller-facing result
queries/     -> visible SQL, query metadata, and mapper tests
```

Treat that shell as a verbose web-application pattern, not the mandatory default scaffold.

Run RFBA inspection after hand edits:

```sh
npx ashiba rfba inspect
```

The inspection uses `ashiba.config.json` `featureRoot`, so this example's subsystem root `src/features/support-inbox` is handled directly. Non-standard shapes are reported as warnings, not errors; customer-owned code can intentionally diverge, but the divergence stays visible during review.

RFBA treats SQL-first persistence behavior as the review boundary. When an application-owned shell exists, boundary files can still act as module closure points; multiple exported runtime functions remain a review signal that either the boundary is too broad or implementation details are leaking through over-export.

## Files To Inspect

- `db/ddl/public.sql` defines the demo schema.
- `src/features/support-inbox/list-tickets/queries/list-tickets/list-tickets.sql` is the main demo SQL.
- `src/features/support-inbox/create-ticket/queries/create-ticket/create-ticket.sql` and `src/features/support-inbox/create-ticket/queries/create-ticket-message/create-ticket-message.sql` are the visible mutation SQL files.
- `src/features/support-inbox/create-ticket/create-ticket.ts` composes the ticket header insert and first message detail insert.
- `src/features/support-inbox/update-ticket-status/queries/update-ticket-status/update-ticket-status.sql` is the optimistic update SQL.
- `src/features/support-inbox/update-ticket-status/update-ticket-status.ts` converts zero updated rows into an application-level conflict.
- `src/features/support-inbox/list-tickets/queries/list-tickets/generated/query.meta.ts` shows safe sort and optional-condition metadata.
- `src/adapters/web/modules/support-inbox/tickets/request/tickets.request.ts` maps public UI filters, preset sort choices, and grid-header sort choices to safe Ashiba inputs.
- `src/adapters/web/modules/support-inbox/tickets/view/tickets.presenter.ts` wires the generated query functions to the application-owned `pg` pool and captures SQL inspection events for the demo panel.
- `src/adapters/web/modules/support-inbox/tickets/route/tickets.route.e2e.test.ts` verifies the real HTTP route with seeded PostgreSQL data, filtered search parameters, pagination, SQL inspection, and safe sort requests.
- `docs/debug-visibility.md` explains how to reuse the adapter observer and Live Query Console pattern without leaking SQL text or parameter values in production logs.
- `tests/support/ztd/verifier.ts` is the starter-owned ZTD verifier generated by Ashiba init and adjusted through dogfooding.
- `DOGFOODING.md` records the customer-style build path and issues found.
- `CUD_DOGFOODING.md` records what the Create lane revealed about mutation scaffolding, drift checks, and mapper tests.

## Run Locally

Prerequisites:

- Node.js and pnpm
- Docker, for the local PostgreSQL container

Run the commands from the repository root.

Install dependencies and build the workspace packages once before running the example. The example imports workspace packages such as `@ashiba-ts/cli`, `@ashiba-ts/driver-adapter-pg`, and `@ashiba-ts/testkit-adapter-pg`; the root build makes their local `dist` output available.

```sh
pnpm install
pnpm build
```

Create the example environment file:

```sh
cp examples/hono-pg-support-inbox/.env.example examples/hono-pg-support-inbox/.env
```

On PowerShell:

```powershell
Copy-Item examples/hono-pg-support-inbox/.env.example examples/hono-pg-support-inbox/.env
```

The checked-in `.env.example` uses PostgreSQL port `55433` to avoid clashing with a local PostgreSQL on `5432`. Change `ASHIBA_TEST_DB_PORT` in `examples/hono-pg-support-inbox/.env` if that port is already in use.

```sh
pnpm --dir examples/hono-pg-support-inbox db:up
pnpm --dir examples/hono-pg-support-inbox db:wait
pnpm --dir examples/hono-pg-support-inbox db:seed
pnpm --dir examples/hono-pg-support-inbox dev
```

Open `http://localhost:3000/tickets`.

To keep request and SQL execution logs visible even when another process starts the dev server, enable the demo application log. It writes JSON Lines with `apiRoute`, `requestId`, `executionId`, SQL identity, timing, row count, and safe parameter summaries to `examples/hono-pg-support-inbox/.logs/app.log` by default:

```powershell
$env:ASHIBA_DEMO_LOG="1"
pnpm --dir examples/hono-pg-support-inbox dev
Get-Content examples/hono-pg-support-inbox/.logs/app.log -Wait
```

For maximum local diagnostics, use the trace profile. This records source SQL, compiled SQL, parameter values, SQL hashes, filter keys, sort keys, and query-model summary. Do not use this profile for long-lived production logs:

```powershell
$env:ASHIBA_DEMO_LOG_PROFILE="trace"
$env:ASHIBA_DEMO_LOG_CONSOLE="0"
pnpm --dir examples/hono-pg-support-inbox dev
Get-Content examples/hono-pg-support-inbox/.logs/app.log -Wait
```

The logger can also be configured in code with a profile plus overrides. This lets customer code decide the observation cost without changing feature code:

```ts
import { configureAppLogger } from './src/adapters/logger/appLogger.js';

configureAppLogger({
  profile: 'standard',
  overrides: {
    includeStartEvents: false,
    includeHashes: true,
  },
});
```

If `pnpm --dir examples/hono-pg-support-inbox db:up` fails in a restricted Windows, sandbox, or Docker pipe environment, start Docker from the example directory directly:

```sh
cd examples/hono-pg-support-inbox
docker compose up -d
cd ../..
```

On PowerShell:

```powershell
Push-Location examples/hono-pg-support-inbox
docker compose up -d
Pop-Location
```

Stop and remove the demo database container when you are done:

```sh
pnpm --dir examples/hono-pg-support-inbox db:down
```

## Verify

The verification commands use the same `.env` file as the local demo.

```sh
pnpm --dir examples/hono-pg-support-inbox typecheck
pnpm --dir examples/hono-pg-support-inbox test
pnpm --dir examples/hono-pg-support-inbox check:drift
```

Or run the example-owned verification gate:

```sh
pnpm --dir examples/hono-pg-support-inbox verify
```

`check:drift` must pass in a clean clone. If it reports that query contracts, metadata, or generated mapping assets are out of sync, the demo source SQL and generated Ashiba assets are not aligned. Refresh them before judging the web app:

```sh
pnpm --dir examples/hono-pg-support-inbox ashiba:generate
pnpm --dir examples/hono-pg-support-inbox check:drift
```

If `test` fails before connecting to PostgreSQL, make sure `db:up` and `db:wait` have been run and the `ASHIBA_TEST_DB_PORT` in `.env` matches the container port.

If `/tickets` renders `Demo is not ready`, read the diagnosis on the page first:

- Metadata drift means the visible SQL and generated Ashiba metadata are out of sync. Run `check:drift`.
- PostgreSQL connection failure means the container is not reachable. Run `db:up` and `db:wait`, or use the direct `docker compose up -d` fallback above before running `db:wait`.
- Credential or database-name errors usually mean `.env` and the running container were changed independently. Restart the container after changing `.env`.

If you set `DATABASE_URL`, the dev server and seed script will use it instead of the `ASHIBA_TEST_DB_*` values. For the standard demo flow, prefer the `.env.example` settings.

## Try an AI Edit

After the demo is running, try asking an AI agent to make a small product change instead of editing every layer by hand.

Recommended first exercise:

```text
Add a priority filter to the support inbox.
Keep the SQL reviewable, refresh Ashiba-generated assets, and run the example verification gate.
```

The goal is to see the review shape, not just the final UI. A good change should keep the main list logic in `src/features/support-inbox/queries/list-tickets/list-tickets.sql`, update the narrow web request/UI boundary, refresh generated query assets with `ashiba:generate`, and pass:

```sh
pnpm --dir examples/hono-pg-support-inbox verify
```

The patch-backed version of this exercise is stored in:

```text
examples/hono-pg-support-inbox/exercises/optional-priority-filter/
```

The demo also includes patch-backed exercises under `examples/hono-pg-support-inbox/exercises/`:

- `sql-inspection-review/` reviews the Live Query Console and explains why dynamic filters and dynamic safe sort still leave SQL reviewable.
- `contract-boundary-narrowing/` narrows conservative generated request contracts from `unknown` to application-owned types and verifies the edit loop.
- `optional-priority-filter/` adds a new optional filter and follows the SQL, metadata refresh, typecheck, and route-test trail.
- `add-customer-locale-column/` adds a list column from SQL and follows the generated metadata, DTO, mapper, and UI changes.
- `ddl-migration-script-from-git/` adds a DDL column and generates reviewable migration SQL from the committed Git snapshot.
- `grid-header-safe-sort/` preserves the grid-header sort task as an exercise reference now that header sorting is part of the starter demo.

Start with the exercise index:

```text
examples/hono-pg-support-inbox/exercises/README.md
```

Each edit exercise keeps a verified `solution.patch` and a verification script so the task can survive library upgrades without committing the solved state into the starter demo.

## Demo Boundary

This is still primarily a list/read demo. It includes minimal Create and optimistic Update lanes to prove the mutation boundary, but it does not claim to cover the full CUD surface.

Future demo lanes should cover:

- update/delete workflows
- advanced transaction patterns
- mutation mapper tests
- optimistic locking or conflict handling
- audit and operational error paths

Keep the larger CUD topics as separate demos so this one can stay focused on visible SQL, safe optional filters, safe sort, and the first mutation proof.
