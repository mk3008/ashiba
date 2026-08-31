# Raw SQL Rules (v6)

## 1. One visible query representation

Express application data access as ordinary SQL for the selected database
dialect, executed through that database driver's native API. Do not introduce
an ORM, query builder, generated query abstraction, hidden data-access layer,
or alternate execution path to solve a local problem.

## 2. Application SQL is source

Keep application DDL and application DML in independent `.sql` assets,
including one-line DML. Inline SQL is limited to driver/control/probe statements
that carry no application data logic: for example `BEGIN`, `COMMIT`,
`ROLLBACK`, `SELECT 1`, and `SELECT NOW()`. Applications choose how assets are
loaded, bundled, or imported; filesystem access is not required by these Rules.

## 3. Current schema is directly inspectable

Keep canonical DDL for the current database structure in the repository.
Migration history may be retained, but is not authority for discovering the
current schema. Organize DDL so a relevant object can be found without replaying
migrations or treating an impractically large dump as the only useful context.
There is no file-size threshold: a schema layout fails this Rule when a reviewer
cannot practically locate the relevant object from repository context alone.

## 4. Runtime data never supplies SQL syntax

Bind runtime values with the driver's parameter mechanism. Do not concatenate
or interpolate external input into application SQL, and do not derive
identifiers, predicates, joins, projections, expressions, grouping, or other
SQL syntax from it. Two reviewed, source-controlled exceptions are allowed:

1. Choose an `ORDER BY` form from a finite whitelist of complete clauses.
2. Choose among complete reviewed SQL assets.

The choice itself must be application-controlled; unrecognized input is
rejected or mapped to a safe default before SQL is selected. A whitelist cannot
be a disguised free-form fragment channel.

For optional filters, prefer one fixed statement whose values are bound (for
example a null guard). When that cannot express the needed semantics, choose
between complete reviewed SQL assets; do not assemble predicate fragments at
runtime. This keeps the exception finite and reviewable without making a
fragment-building API.

## 5. Preserve parameter meaning

When the selected driver's application-facing API supports native named
parameters, write the driver's named placeholders in source SQL and bind by
name. Names describe a value's meaning, not its position. Repeated placeholders
reuse the same meaning; a maintenance change updates the SQL asset and named
binding together.

For a positional-only driver, deterministic named-to-positional lowering may be
needed. That adapter is application-owned and remains outside these Rules; it
must not require adopting a framework.

## 6. Make non-obvious SQL reviewable

Format SQL normally. Add comments only for non-obvious business intent,
correctness/concurrency or locking assumptions, and performance decisions.
Do not hide meaningful behavior in generated or proprietary syntax.

## 7. Keep application ownership with the application

The application owns connections/pools, transactions, retries, logging, result
mapping, migrations, deployment, tests, and business semantics. These Rules do
not prescribe their architecture and must not grow into a framework.

## 8. Verify behavior at the real database boundary

The target database engine and its native driver are the authority for query
behavior and application-facing runtime result types. Exercise representative
application SQL through that driver against the target engine, preferably in
automated regression tests using a disposable local or container database.

Do not establish a runtime result contract solely from DDL declarations, static
language types, mocks, or type assertions. Unit and static tests are useful,
but do not replace database-backed tests for SQL behavior, driver mappings,
constraints, transactions, or database-specific semantics. Changes to SQL keep
or extend the relevant regression coverage.

Test architecture remains application-owned. These Rules prescribe no testkit,
mocking layer, loader, or test pyramid.

Follow the application's existing database-backed regression pattern. Changed
database behavior remains covered by that pattern; an existing regression may
be reused when it already proves the changed behavior.

If no database-backed regression path exists, establish the smallest reusable
path: apply only the relevant canonical DDL to the target database, execute
representative application SQL through the native driver, assert meaningful
behavior and relevant runtime result representations, and provide one
repeatable command. Do not create broad test infrastructure merely to satisfy
this bootstrap.

## Decision rule

When a request appears to need a new abstraction, first try: existing SQL asset
+ canonical DDL + native driver + application test. If this cannot work, state
the exact mechanical fact that requires code; do not silently add a framework
or helper.
