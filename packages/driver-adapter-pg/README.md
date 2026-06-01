# @ashiba-ts/driver-adapter-pg

Thin Ashiba adapter for [`pg`](https://www.npmjs.com/package/pg) compatible clients.

This package is the PostgreSQL runtime adapter used by Ashiba-generated
TypeScript code. It is normally paired with `@ashiba-ts/cli` and
`@ashiba-ts/testkit-adapter-pg`.

Start with the repository README for the full SQL-first workflow:

- [Ashiba README](https://github.com/mk3008/ashiba#readme)
- [Command API](https://mk3008.github.io/ashiba/generated/api/commands)

## What This Package Owns

It owns named parameter binding, parameter contract checks, logger-ready execution events, and safe sort rendering. It does not own transactions, business SQL, ORM behavior, or DDL pull.

Application code should call the adapter with a file-backed or generated query source object containing SQL text, SQL path, and query model metadata. The adapter still passes a SQL string to the wrapped `pg` client internally, but it does not expose an `execute(sql: string, ...)` convenience boundary for arbitrary runtime SQL input.

The adapter verifies the source SQL hash and uses CLI-generated Postgres SQL plus ordered parameter names. If metadata is absent or stale, execution fails before the wrapped driver is called.

Safe sort requires CLI-generated query model analysis when sort input is provided. Source SQL stays ordinary SQL without Ashiba-only comments or replacement markers. Runtime AST parsing is intentionally avoided by default. The adapter verifies the source SQL hash, treats query model sortable metadata as the maximum allowed sort surface, and uses query model safe-sort metadata to splice either a new `ORDER BY` clause or an additional comma-separated sort expression at the recorded insertion position. Sort keys must exactly match the query model whitelist; raw ORDER BY fragments, guessed column names, and case-folded matches are rejected. An explicit runtime sort profile may refine default directions, but it cannot replace query model SQL expressions.

Root compound queries such as `UNION`, `INTERSECT`, and `EXCEPT` are rejected from query model shape metadata instead of being parsed at runtime. The reported next action is to wrap the compound query in an explicit subquery and expose stable sortable columns.

Current contract tests cover `pg` compatible query delegation, named parameter binding, unused parameter rejection before driver execution, query-model-gated safe sort rendering, stale metadata rejection, masked/unmasked observer events, and error event emission.

Live PostgreSQL smoke can be run by setting `ASHIBA_TEST_DATABASE_URL` or `DATABASE_URL` before `pnpm test`. Without that environment variable, the live smoke is skipped.
