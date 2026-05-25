# @ashiba/driver-adapter-pg

Thin Ashiba adapter for [`pg`](https://www.npmjs.com/package/pg) compatible clients.

It owns named parameter binding, parameter contract checks, logger-ready execution events, and safe sort rendering. It does not own transactions, business SQL, ORM behavior, or DDL pull.

When CLI-generated query model binding metadata is available, the adapter verifies the source SQL hash and uses the precomputed Postgres SQL plus ordered parameter names. If metadata is absent or binder options are overridden, it falls back to runtime lexical binding.

Safe sort requires CLI-generated query model analysis when sort input is provided. Source SQL stays ordinary SQL without Ashiba-only comments or replacement markers. Runtime AST parsing is intentionally avoided by default. The adapter verifies the source SQL hash, treats query model sortable metadata as the maximum allowed sort surface, and uses query model safe-sort metadata to splice either a new `ORDER BY` clause or an additional comma-separated sort expression at the recorded insertion position. An explicit runtime sort profile may refine default directions, but it cannot replace query model SQL expressions.

Root compound queries such as `UNION`, `INTERSECT`, and `EXCEPT` are rejected from query model shape metadata instead of being parsed at runtime. The reported next action is to wrap the compound query in an explicit subquery and expose stable sortable columns.

Current contract tests cover `pg` compatible query delegation, named parameter binding, unused parameter rejection before driver execution, query-model-gated safe sort rendering, stale metadata rejection, masked/unmasked observer events, and error event emission.

Live PostgreSQL smoke can be run by setting `ASHIBA_TEST_DATABASE_URL` or `DATABASE_URL` before `pnpm test`. Without that environment variable, the live smoke is skipped.
