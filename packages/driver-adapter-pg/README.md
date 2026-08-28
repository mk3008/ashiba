# @ashiba-ts/driver-adapter-pg

Optional Ashiba convenience adapter for [`pg`](https://www.npmjs.com/package/pg) compatible clients.

This package is an optional PostgreSQL compatibility/convenience surface. Native
`pg` clients, pools, transactions, and `query(sql, values)` calls remain the
application-owned baseline. It may be paired with `@ashiba-ts/cli`, but is not
required application architecture.

Start with the repository README for the full SQL-first workflow:

- [Ashiba README](https://github.com/mk3008/ashiba#readme)
- [Command API](https://mk3008.github.io/ashiba/generated/api/commands)

## What This Package Owns

It consumes shared `@ashiba-ts/named-parameters` binding metadata, then owns PostgreSQL-specific parameter contract checks, logger-ready execution events, metadata-backed optional-condition compression, metadata-backed safe sort rendering, and transient-error classification for caller-owned retry policies. It does not own transactions, business SQL, ORM behavior, relation loading, lazy loading, unit of work, SAGA/compensation workflows, hidden automatic retry, or DDL pull.

Application code supplies SQL text and query-model metadata to the adapter.
Loading, bundling, embedding, and optional source-path provenance are
application/build-tool owned; this package does not load SQL through `node:fs`.
The adapter still passes a SQL string to the wrapped `pg` client internally, but
it does not expose an `execute(sql: string, ...)` convenience boundary for
arbitrary runtime SQL input.

The adapter verifies the source SQL hash and uses CLI-generated indexed PostgreSQL SQL plus its `parameterNames` identity list. Binding is performed by the shared package; the adapter never parses or rewrites canonical SQL at runtime. If metadata is absent or stale, execution fails before the wrapped driver is called.

When query metadata includes an optional PostgreSQL-derived contract, the
adapter also rejects a stale contract and a declared driver representation
profile mismatch before calling `pg`. The default profile is
`node-postgres-default`. Applications that configure custom `pg` type parsers
must pass a stable profile identifier:

```ts
const adapter = createPostgresAdapter(pool, {
  driverProfile: 'custom:application-v1',
});
```

This option is an assertion about caller-owned driver configuration, not a
parser configuration API. Ashiba never installs, replaces, or introspects
node-postgres type parsers. Generate the matching development contract with
`ashiba postgres-contract --driver-profile custom:application-v1`;
custom profiles keep driver values as `unknown` until application-owned decoding
proves a narrower type.

Safe sort requires CLI-generated query model analysis when sort input is provided. Source SQL stays ordinary SQL without Ashiba-only comments or replacement markers. Runtime AST parsing is intentionally avoided by default. The adapter verifies the source SQL hash, treats query model sortable metadata as the maximum allowed sort surface, and uses query model safe-sort metadata to splice either a new `ORDER BY` clause or an additional comma-separated sort expression at the recorded insertion position. Sort keys must exactly match the query model whitelist; raw ORDER BY fragments, guessed column names, and case-folded matches are rejected. An explicit runtime sort profile may refine default directions, but it cannot replace query model SQL expressions.

Root compound queries such as `UNION`, `INTERSECT`, and `EXCEPT` are rejected from query model shape metadata instead of being parsed at runtime. The reported next action is to wrap the compound query in an explicit subquery and expose stable sortable columns.

Current contract tests cover `pg` compatible query delegation, named parameter binding, unused parameter rejection before driver execution, query-model-gated safe sort rendering, stale metadata rejection, masked/unmasked observer events, and error event emission.

For transient database failures, use `classifyPostgresTransientError` or `isPostgresTransientError` as input to an explicit retry boundary such as `withAshibaRetry` from `@ashiba-ts/driver-adapter-core`. The classifier only identifies retry candidates; application code still decides whether the operation is safe to run again.

Live PostgreSQL smoke can be run by setting `ASHIBA_TEST_DATABASE_URL` or `DATABASE_URL` before `pnpm verify:postgres-live`. Without that environment variable, the live smoke is skipped.
