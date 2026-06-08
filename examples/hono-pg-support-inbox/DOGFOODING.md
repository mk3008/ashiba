# Support Inbox Demo Dogfooding Log

This file records the build path for the Hono + PostgreSQL + Ashiba support inbox demo from a customer-like perspective.

## Goal

Build a real read-heavy web app demo that communicates Ashiba's value:

- visible SQL remains the source asset
- boring TypeScript support is generated around that SQL
- optional filters are safe parameters
- safe sort is constrained to reviewed SQL expressions
- generated mapper tests and drift checks stay in the normal workflow

## Acceptance Criteria

- The demo runs as a Hono web app against PostgreSQL.
- The main list screen uses Ashiba-generated query boundaries.
- The list SQL includes safe optional filters for common inbox fields.
- Runtime sort choices are mapped to generated safe sort keys.
- The demo has seed data that makes filters, SLA states, and sort choices visible.
- Typecheck, tests, and Ashiba fast check pass.
- Any friction in Ashiba's customer workflow is recorded honestly.

## Build Steps Taken

1. Created `examples/hono-pg-support-inbox`.
2. Added the example to `pnpm-workspace.yaml`.
3. Ran `ashiba init --db postgres --driver pg --with-demo-ddl`.
4. Replaced the starter DDL with support inbox tables.
5. Imported two SQL files with `ashiba feature import`:
   - `support-inbox/list-tickets`
   - `support-inbox/get-ticket-detail`
6. Built a Hono page around generated query functions and an application-owned `pg` pool.
7. Added seed data and a minimal request parsing test.
8. Ran typecheck, Vitest, and Ashiba checks.
9. Fixed demo SQL and Ashiba CLI issues found during dogfooding.

## Issues Found

### CTE final table inference is conservative

The first list SQL ended with `from ticket_base`, where `ticket_base` was a CTE. `ashiba feature import` failed because the scaffold table inference looked for a real DDL table named `ticket_base`.

Resolution in this demo:

- Kept CTEs for supporting data.
- Changed the final `from` source to `public.tickets`.

Product note:

- Resolved in the CLI after this demo was built.
- `ashiba feature import` now keeps the final source as an anchor source and records physical DDL tables separately, so CTE-anchored read queries can generate metadata without treating the CTE itself as a table.

### Formatter safety skipped complex imported SQL

Both imported SQL files reported that formatting was skipped because token sequence changed.

Resolution in this demo:

- Accepted the skip. Preserving SQL is safer than rewriting it.

Product note:

- Resolved in the CLI after this demo was built.
- `ashiba feature import` now accepts formatter output when it preserves comments, named parameters, and AST round-trip output. This allows harmless normalization such as adding explicit `AS` to table aliases.
- `query format` remains more conservative because it rewrites an existing SQL file directly.

### SQL lint needed CTE naming and keyword search adjustments

The initial list SQL used a CTE named `ticket_tags`, which overlapped with the physical table name. SQL lint reported a missing column on the wrong relation.

The keyword filter originally moved away from `ILIKE '%' || :keyword || '%'` to reduce analysis friction. That was too DBMS-hostile as a long-term recommendation: PostgreSQL substring search is naturally expressed with `ILIKE`/`LIKE`, and production deployments can pair that shape with DBMS-native search/index strategies.

Resolution in this demo:

- Renamed the CTE to `aggregated_tags`.
- Restored the SSSQL shape `(:keyword is null or column ilike '%' || :keyword || '%')`.
- Updated SSSQL runtime compression so null keyword removes the optional branch, while a present keyword prunes only the null guard and leaves the natural predicate, for example `column ilike '%' || $1 || '%'`.

Product note:

- SSSQL should preserve the DBMS-natural predicate shape and make the optional guard disappear safely at runtime.

### Generated mapper cases used invalid timestamp fixtures

Generated ZTD mapper probes cast values like `"created_at-1"` to `timestamptz`, causing PostgreSQL execution failures.

Resolution:

- Updated the CLI generation path to use valid ISO timestamp samples for timestamp columns.

Product note:

- This is a real generated-code quality issue and should be covered by CLI tests.

### ZTD verifier treated Date values as plain objects

The generated verifier normalized `Date` values as plain objects, producing `{}` in comparisons.

Resolution:

- Updated the generated verifier logic to keep plain object detection strict and normalize `Date` to ISO when the expected value is a string.

Product note:

- This should remain in the CLI starter output.

### `unknown` vs `unknown` was reported as mapper drift

`ashiba check` reported mapper drift for fields where both the SQL-side type and mapper type were `unknown`.

Resolution:

- Updated the CLI result type drift classifier so equal normalized types pass before treating `unknown` as an error.

Product note:

- This was a false positive in project check and is now fixed in the local source.

### Optional compression and safe sort exposed runtime metadata gaps

The project-level checks passed, but the first browser run failed at runtime in the PostgreSQL driver adapter.

Two issues appeared:

- Binding-side optional-condition metadata stored branch-local `$1/$2` text, while the full compiled SQL used global placeholder numbers.
- After optional-condition compression renumbered placeholders, safe sort insertion could land inside `limit`, producing SQL like `limi order by ... t $5`.

Resolution:

- Removed binding-side removal text from generated optional-condition metadata.
- Re-aligned driver-side `order by` insertion to nearby clause boundaries after compression and placeholder renumbering.
- Added `where true` to the demo SQL while the issue was being investigated, then removed it once leading optional branch removal was fixed.
- Fixed the PostgreSQL driver adapter so `where true` is not required for correctness when leading optional branches are removed before required conditions.

Product note:

- Project checks should eventually catch this combination without requiring a browser run.
- Docs may show `where true` as an ordinary SQL style option, but optional-condition compression must preserve valid SQL without requiring that anchor.

### Filtered search was not covered by E2E at first

The initial verification covered request parsing, generated mapper/ZTD tests, drift checks, and one browser screenshot of the default inbox. It did not cover submitting real filters through the HTTP route.

That allowed `status=open` to fail in the browser with a PostgreSQL parameter type error even though the unit tests were green.

Resolution:

- Added explicit casts to optional filter null checks in `list-tickets.sql`.
- Added route-level E2E coverage under `src/adapters/web/modules/support-inbox/tickets/route/` to seed PostgreSQL and verify `/tickets`, `/tickets?status=open...`, and `/tickets?keyword=ログイン...` through the Hono app.

Product note:

- For demos, route-level tests must cover the primary user interactions, not just parser helpers and mapper contracts.

### Casted SSSQL null guards were not compressed

PostgreSQL can fail to infer a parameter type for a bare `$1 is null` guard when the value is null, so the demo SQL used guards such as `cast(:status as text) is null`.

The first SQL inspection panel made it visible that these guards were still present in compiled SQL for `status=open`, for example `cast($1 as text) is null or t.status = $2`. That meant SSSQL compression metadata only recognized the bare `:keyword is null` shape and missed casted guards.

Resolution:

- Updated optional-condition compression metadata generation to recognize `cast(:param as type) is null` as the same SSSQL null guard.
- Fixed named parameter collection so PostgreSQL casts like `array[]::text[]` are not mistaken for named parameters.
- Re-generated the support inbox query metadata so all public optional filters are compressible.
- Fixed safe sort insertion realignment after many optional-condition rewrites, preventing safe sort from being inserted into the middle of the stable `order by t.ticket_id` suffix.

Product note:

- The SQL inspection panel is valuable because it exposes whether the final execution SQL actually matches the SSSQL promise.
- PostgreSQL-friendly SSSQL should allow explicit null-guard casts while still compressing to the natural predicate when the parameter is present.

### Source-proximal filtering exposed CTE metadata gaps

The evaluation report correctly noted that the first list SQL applied most filters in the final `where`, after message and tag helper CTEs had already been built. That made the demo strong as a readability story, but weaker as a performance-oriented SQL-ownership story.

Resolution:

- Reworked `list-tickets.sql` so ticket, customer, SLA, channel, language, and tag scope are narrowed in `filtered_tickets` before latest-message lookup, last-customer-reply aggregation, and full tag aggregation.
- Preserved keyword search semantics by applying the latest-message-body keyword condition after `latest_message` exists, then using the resulting `searchable_tickets` scope for downstream aggregations.
- Kept full tag display semantics: filtering by one tag still returns the complete tag list for each matching ticket.
- Added output casts in the final projection so the editable TypeScript query contract remains aligned even though final columns now flow through CTE aliases.
- Updated route-level E2E expectations to assert the source-proximal SQL shape in the SQL inspection panel.

Product note:

- CLI DDL-aware lint now carries outer CTE names into nested CTE queries, so CTE-to-CTE references are not mistaken for missing physical DDL tables.
- CLI Postgres binding metadata now compiles grouped optional-condition removal text with full SQL placeholder context, so runtime optional compression does not reject valid refreshed metadata when earlier parameters appear before the grouped `where`.

## Current Verification

- `ASHIBA_TEST_DB_PORT=55433 pnpm --dir examples/hono-pg-support-inbox db:seed`: passed
- `pnpm --dir examples/hono-pg-support-inbox verify`: passed, including typecheck, `check:drift`, and route-level Vitest coverage for all public filters, safe sort choices, SQL inspection, and compressed SSSQL output
- `pnpm --filter @ashiba-ts/cli build`: passed
- `pnpm --filter @ashiba-ts/cli test -- tests/smoke.test.ts`: passed

## External Evaluation Report Dogfooding Tasks

Source: `ashiba-evaluation-report.md`, dated 2026-06-08.

This report is treated as customer-style dogfooding feedback. It covers a fresh clone of `mk3008/ashiba` and evaluates whether the support inbox demo, docs, checks, and runtime adapter behavior match the product promise.

| Priority | Status | Task | Notes |
| --- | --- | --- | --- |
| P0 | done | Ship the support inbox demo in a clone-to-green state. | The report found `check:drift` failures and `/tickets` HTTP 503 from stale query metadata. The example now documents `typecheck`, `test`, `check:drift`, and `verify`; current dogfooding verification records those checks as passing. Keep this as a release-blocking demo invariant. |
| P0 | done | Add CI coverage for the example drift and HTTP route path. | `.github/workflows/verify.yml` starts PostgreSQL directly from the example directory, seeds the DB, and runs `pnpm --dir examples/hono-pg-support-inbox verify`, which includes `check:drift` and route-level Vitest coverage. |
| P0 | done | Separate metadata drift from database-startup failures on the demo error page. | The `/tickets` error page now identifies query metadata drift separately and points to `check:drift` / `ashiba:generate`; PostgreSQL startup failures point to `db:up` and direct `docker compose up -d`. Route E2E covers both messages. |
| P0 | done | Cover adapter composition where optional-condition compression and safe sort interact. | The report found `where and ...` and safe-sort insertion-position failures after compression and placeholder renumbering. Driver-adapter regression coverage now covers this composition, and route-level E2E exercises public filters plus safe sort. |
| P1 | done | Document Windows / sandbox Docker fallback. | The example README now documents direct `docker compose up -d` from the example directory for restricted Windows, sandbox, or Docker pipe environments. |
| P1 | done | Make the workspace build prerequisite explicit. | The example README now tells users to run `pnpm install` and `pnpm build` from the repository root before running the workspace-backed example. |
| P1 | partial | Make adapter behavior visible enough that it is not a black box. | The SQL inspection panel shows compiled SQL, bound parameters, selected safe sort, and stable suffix. Remaining improvement: factor this into reusable adapter/debug guidance so future demos do not reimplement the visibility surface ad hoc. |
| P1 | partial | Strengthen project-level checks so runtime composition issues are caught before browser dogfooding. | The example CI now runs route-level tests, and adapter unit tests cover the known composition bug. Remaining question: whether `ashiba check --full`, generated verification, or example CI should own full HTTP route execution for future examples. |
| P1 | done | Improve the performance demonstration for source-proximal filtering. | `list-tickets.sql` now narrows ticket/customer/tag scope before latest-message lookup, customer-reply aggregation, and tag aggregation, while preserving visible SQL, paging, count, safe sort, keyword semantics, and full tag display. This also dogfooded refresh, DDL-aware lint, generated mapper contracts, and route-level SQL inspection. |
| P2 | open | Add a separate CUD / mutation dogfooding lane. | The report could not evaluate CUD, transaction boundaries, mutation mapper tests, optimistic locking, audit, or affected-row behavior. This should be a separate adoption demo or clearly scoped extension, not hidden inside the read-heavy demo. |

## Remaining Product Questions

| Priority | Status | Task | Notes |
| --- | --- | --- | --- |
| P0 | done | Keep demo verification route-level. | The demo has PostgreSQL-backed HTTP E2E coverage for the default list, public filters, keyword search, and all safe sort choices. Add coverage when new public filters or sort choices are added. |
| P0 | done | Support `feature import` for CTE-anchored read queries. | Fixed by `fix(cli): import cte-anchored sql metadata`. Keep the demo SQL or a fixture covering final CTE sources in CLI tests. |
| P0 | done | Let `feature import` format harmless SQL normalization. | Fixed by `fix(cli): relax feature import formatting safety`. The import path allows semantic formatter changes while still protecting comments, named parameters, and AST round-trip equality. |
| P0 | done | Compose optional-condition compression with safe sort. | Fixed by `fix(pg): compose optional compression with safe sort`. The driver adapter has regression coverage for range-only compression metadata and safe sort insertion after compression. |
| P1 | done | Keep keyword filters in DBMS-natural SSSQL form. | The demo uses `(:keyword is null or column ilike '%' \|\| :keyword \|\| '%')`; runtime compression removes the whole branch when null and prunes only the guard when present. |
| P1 | done | Preserve required predicates after leading optional branch removal. | Fixed in the PostgreSQL driver adapter. `where (:email is null or email = :email) and tenant_id = :tenant_id` now compresses to `where tenant_id = $1` when `email` is null, so `where true` is no longer required for correctness. |
| P1 | done | Provide a user-facing safe sort surface. | The demo page shows the public sort labels, the safe sort key sequence each label maps to, and the fixed `ticket_id asc` stable suffix. A future CLI/helper could still reduce app-owned display wiring, but the adoption demo surface is present. |
| P1 | done | Add a SQL inspection panel to the demo. | The demo page shows the selected sort, safe sort keys, stable suffix, bound parameter names, and compiled SQL captured from the Ashiba PostgreSQL adapter observer. Users can see the visible SQL story without reading terminal logs. |
| P1 | open | Add README AI edit exercise. | The planning doc calls for a 5-10 minute edit exercise, but the example README currently focuses on running and verifying the demo. |
| P2 | open | Add a separate CUD demo lane. | The support inbox demo intentionally proves the read-heavy path only. The external evaluation report also flags CUD, transactions, mutation mapper tests, optimistic locking, audit, and affected-row behavior as unevaluated. |
| P2 | open | Decide whether CUD belongs in the same example app. | Keeping it separate protects the read demo's focus; sharing the same domain may make the adoption story easier to compare. This needs human product judgment. |
| P2 | partial | Decide the standard owner for full runtime composition checks. | Optional compression and safe sort now have direct regression coverage, and example CI runs the route-level demo tests. Remaining question: whether `ashiba check --full`, generated verification, or per-example CI should own this pattern for future examples and customer projects. |
