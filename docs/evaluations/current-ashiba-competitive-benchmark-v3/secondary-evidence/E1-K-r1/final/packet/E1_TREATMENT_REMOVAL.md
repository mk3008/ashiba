# E1-K-r1 treatment removal record

## Scope and source issue

The frozen G1 `createApplication(runtime)` contract must retain its observable
ticket behavior after the K arm's data-access treatment is removed. The final
execution path is native `pg`, with visible SQL and no replacement ORM, query
builder, generator, or compatibility layer.

## Acceptance items and verification methods

1. `createApplication(runtime)` and its `list`, `get`, `create`, `assign`, and
   `close` behavior remain available. Verify with the runner's independent G1
   execution.
2. Every database operation uses the `pg` pool or a directly acquired `pg`
   client. Verify source and emitted output for the absence of the frozen K
   markers and inspect the explicit SQL calls.
3. Assignment remains atomic: update plus audit insert run between `BEGIN` and
   `COMMIT`, with rollback on error. Verify through the runner's G1 database
   assertions.
4. Candidate dependency and emitted artifact state contain no Kysely entry.
   Verify `package.json`, `package-lock.json`, and `dist/application.js`.

## Removed or replaced state

- Dependency removed: `kysely@0.29.5` from `package.json` and its lockfile
  package entry.
- Source configuration removed: Kysely database table interfaces, dialect,
  schema wrapper, fluent query calls, and lifecycle destroy call.
- Replacement: direct parameterized `pg` queries; the schema identifier is
  quoted locally and user-supplied values are passed as query parameters.
- Generated state replaced: `dist/application.js` now mirrors the native `pg`
  source path and contains no Kysely import or fluent query state.
- Commands removed: none; the candidate had no Kysely-specific script or
  generation command. The ordinary `typecheck` and `build` TypeScript commands
  remain. Candidate dependency installation (`npm ci --ignore-scripts`) is
  runner-owned and was not run during this edit.

## Working rules and decision points

- No runner, fixture, DDL, database, or other-cell file is changed.
- The retained `pg` dependency is the final direct driver, not a compatibility
  wrapper around the removed treatment.
- Final behavioral verification requires the runner-installed dependencies and
  its independently provisioned G1 database.
