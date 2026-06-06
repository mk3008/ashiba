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

| Priority | Status | Task | Notes |
| --- | --- | --- | --- |
| P0 | partial | Keep demo verification route-level. | The demo now has PostgreSQL-backed HTTP E2E coverage for the default list, `status=open`, and keyword search. Add coverage when new public filters or sort choices are added. |
| P0 | done | Support `feature import` for CTE-anchored read queries. | Fixed by `fix(cli): import cte-anchored sql metadata`. Keep the demo SQL or a fixture covering final CTE sources in CLI tests. |
| P0 | done | Let `feature import` format harmless SQL normalization. | Fixed by `fix(cli): relax feature import formatting safety`. The import path allows semantic formatter changes while still protecting comments, named parameters, and AST round-trip equality. |
| P0 | done | Compose optional-condition compression with safe sort. | Fixed by `fix(pg): compose optional compression with safe sort`. The driver adapter has regression coverage for range-only compression metadata and safe sort insertion after compression. |
| P1 | open | Document analyzable keyword filter patterns. | The demo uses `position(lower(:keyword) in lower(...)) > 0` instead of concatenated `ILIKE '%' || :keyword || '%'`. Docs should explain this as a mechanical-analysis-friendly pattern, not as a universal SQL style rule. |
| P1 | open | Document stable optional-filter anchors. | When optional compression is mixed with non-compressed conditions, examples should show `where true` or another stable anchor so branch removal cannot delete the whole `where` context. |
| P1 | open | Provide a user-facing safe sort surface. | The current demo maps public sort choices in application code. A future CLI/helper path could expose reviewed display keys without adding helper rank columns to result DTOs. |
| P1 | open | Add a SQL inspection panel to the demo. | A small panel could show compiled SQL, bound parameter names, and selected safe sort key so users can see the "visible SQL" story without reading terminal logs. |
| P1 | open | Add README AI edit exercise. | The planning doc calls for a 5-10 minute edit exercise, but the example README currently focuses on running and verifying the demo. |
| P2 | open | Add a separate CUD demo lane. | The support inbox demo intentionally proves the read-heavy path only. CUD should be a separate adoption demo covering mutation mapper tests, transaction boundaries, affected rows, and business constraints. |
| P2 | open | Decide whether CUD belongs in the same example app. | Keeping it separate protects the read demo's focus; sharing the same domain may make the adoption story easier to compare. This needs human product judgment. |
