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

- Importing existing SQL that ends from a CTE should either work or produce a clearer explanation for imported read queries.

### Formatter safety skipped complex imported SQL

Both imported SQL files reported that formatting was skipped because token sequence changed.

Resolution in this demo:

- Accepted the skip. Preserving SQL is safer than rewriting it.

Product note:

- This is acceptable, but the message should be expected in complex demos and docs should explain why this is a good failure mode.

### SQL lint needed CTE naming and keyword search adjustments

The initial list SQL used a CTE named `ticket_tags`, which overlapped with the physical table name. SQL lint reported a missing column on the wrong relation.

The keyword filter also used string concatenation with `ILIKE '%' || :keyword || '%'`, which triggered an analysis-risk warning.

Resolution in this demo:

- Renamed the CTE to `aggregated_tags`.
- Replaced concatenation with `position(lower(:keyword) in lower(...)) > 0`.

Product note:

- The final SQL is more mechanically analyzable, but examples should teach this pattern directly.

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
- Added `where true` to the demo SQL so compressed optional branches can be removed without deleting the whole `where` clause while a non-compressed keyword condition remains.

Product note:

- Project checks should eventually catch this combination without requiring a browser run.
- Docs should show `where true` or another stable anchor pattern when optional compression is mixed with non-compressed conditions.

### Filtered search was not covered by E2E at first

The initial verification covered request parsing, generated mapper/ZTD tests, drift checks, and one browser screenshot of the default inbox. It did not cover submitting real filters through the HTTP route.

That allowed `status=open` to fail in the browser with a PostgreSQL parameter type error even though the unit tests were green.

Resolution:

- Added explicit casts to optional filter null checks in `list-tickets.sql`.
- Added `src/demo/app.e2e.test.ts` to seed PostgreSQL and verify `/tickets`, `/tickets?status=open...`, and `/tickets?keyword=ログイン...` through the Hono app.

Product note:

- For demos, route-level tests must cover the primary user interactions, not just parser helpers and mapper contracts.

## Current Verification

- `pnpm --dir examples/hono-pg-support-inbox typecheck`: passed
- `ASHIBA_TEST_DB_PORT=55433 pnpm --dir examples/hono-pg-support-inbox test`: passed, including filtered HTTP E2E
- `pnpm --dir examples/hono-pg-support-inbox check:drift`: passed
- `ASHIBA_TEST_DB_PORT=55433 pnpm --dir examples/hono-pg-support-inbox db:seed`: passed
- Playwright screenshot of `http://localhost:3000/tickets`: passed

## Remaining Product Questions

- Should `feature import` support imported read queries whose final relation is a CTE?
- Should docs recommend `position(lower(:keyword) in lower(...))` for analyzable keyword filters?
- Should safe sort have a first-class way to expose user-facing sort keys without adding helper rank columns to the result DTO?
- Should the demo add a small SQL logger panel so users can inspect the compiled SQL without opening terminal logs?
- CUD still needs a separate demo lane.
