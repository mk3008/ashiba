# DBMS Compatibility Evaluation

## Scope and method

This is an evidence-only evaluation of the existing native-driver boundary. It does not add product code, a CLI command, a runtime parser, a driver abstraction, or a starter.

The same small application slice was executed against PostgreSQL 18.1 with `pg` 8.21.0, MySQL 8.4.11 with `mysql2` 3.15.3, and SQL Server 2022 with `mssql` 11.0.1. It covered a join, get by id, explicit ordering, a nullable result, a repeated optional filter, insert, update, generated-id behavior, and a rollback. The canonical parameter source was compiled by the existing `@ashiba-ts/named-parameters/compiler`, bound by the existing runtime binder, and executed through an application-owned native client/pool/request.

The executable harness is [evaluation/dbms-compatibility.mjs](evaluation/dbms-compatibility.mjs); its unedited live output is [raw-results.json](raw-results.json). It uses no value interpolation. A hostile value was bound separately and did not alter either schema or query semantics.

## Result

| DBMS / driver | Native path | Binding observation | Classification |
| --- | --- | --- | --- |
| PostgreSQL / `pg` | `compiled.sql`, ordered values → `client.query(sql, values)` | indexed `$1`, `$2`; repeated logical names remain unique | natural-fit |
| MySQL / `mysql2` | `compiled.sql`, occurrence-order values → `connection.execute(sql, values)` | anonymous `?`; repeated logical names appear once per occurrence | fit-with-small-gap |
| SQL Server / `mssql` | generated `@name` SQL; application calls `request.input(name, value)` then `request.query(sql)` | named `@customerId`, `@status`; names remain unique | fit-with-small-gap |

The cross-DBMS classification is **current-core-generalizes** for the evaluated canonical named-SQL/binding/runtime boundary. The core already emits all three binding forms in `model-gen`, and live execution confirmed that each reaches its native driver without an Ashiba execution owner.

This does **not** generalize the PostgreSQL-derived parameter/result contract command, PostgreSQL safe-sort/compression metadata, starter, or testkit. Those are deliberately PostgreSQL-specific product surfaces today. This evaluation does not claim a portable type contract or uniform runtime values.

## Responsibility boundary

The successful path for every evaluated DBMS is:

```text
canonical dialect SQL with meaningful named values
  -> development-time deterministic lowering and generated binding metadata
  -> runtime metadata binding and validation
  -> application-owned native pool/client/request and transaction
```

Application code owns connection/pool lifecycle, transactions, retry policy, logging, result interpretation, and generated-id handling. Ashiba owns neither an ORM nor a hidden execution adapter. The existing mysql2 and mssql adapters can be used as optional conveniences; they are not required for the native path.

## Parameterization and metadata controls

All three lowerings retained values outside SQL text. The hostile string `Ada'; drop table customers; --` was supplied only through the native parameter mechanism; it returned no match and the table remained present.

Missing and unused parameter objects were rejected with `ASHIBA_MISSING_PARAMETER` and `ASHIBA_UNUSED_PARAMETER`. A deliberately stale source SQL with otherwise valid generated metadata was rejected as `ASHIBA_QUERY_MODEL_STALE` before the wrapped native client was called for all three adapter paths. See the raw result.

PostgreSQL required a dialect-local type annotation in the optional repeated filter: `:status::text`. The unannotated `(:status is null OR ...)` form was rejected by PostgreSQL with `42P08` because a null-only use leaves the parameter type unresolved. MySQL and SQL Server accepted the unannotated form. This is normal dialect SQL ownership, not an Ashiba lowering difference.

## Native result and DML representation

The live results demonstrate why Ashiba must not normalize driver representations:

| Surface | `pg` | `mysql2` (default configuration) | `mssql` |
| --- | --- | --- | --- |
| `bigint` selected | `string` | `number` in this run | `string` |
| `decimal/numeric` selected | `string` | `string` | `number` |
| timestamp/datetime | `Date` | `Date` | `Date` |
| boolean/bit | `boolean` | `number` | `boolean` |
| nullable bigint | `null` | `null` | `null` |
| update outcome | `rowCount` | `affectedRows` | `rowsAffected` array |
| generated id | `RETURNING` row, `string` | insert header `insertId`, `number` | `OUTPUT INSERTED.id` row, `string` |

The MySQL bigint observation is configuration-sensitive; no `supportBigNumbers`/`bigNumberStrings` option was set. It is recorded as driver/application policy, not a safe cross-driver number claim.

## Existing product audit

The deterministic named-parameter compiler and binder are cross-driver in this evaluated sense: `model-gen.ts` emits PostgreSQL indexed, mysql2 anonymous, and mssql named bindings. The compiler preserves repeated-name semantics, quoted strings, comments, dollar strings, casts, and does no runtime rewrite. The runtime binder only checks generated metadata and creates values.

The CLI feature generation/checking path still treats the PostgreSQL binding as the complete contract surface; PostgreSQL-derived type contracts, safe sort, optional-condition compression, starter, testkit, and DDL pull remain PostgreSQL-specific. That is observable, intentional product scope rather than evidence for a generic abstraction. No DBMS-specific product surface is proposed in this evaluation.

## Distribution and reference naturality

Fresh-agent checks were each performed once, independently of this live evaluation:

- mysql2: native building blocks are discoverable, but there is no complete MySQL starter/reference or testkit path; `ashiba init --db mysql --driver mysql2` rejects the request.
- mssql: the same conclusion holds for SQL Server; native `request.input(...).query(...)` is possible, but no copyable SQL Server starter/reference/testkit path is distributed and `init` rejects it.

Those are distribution/documentation gaps, not a reason to add an adapter, parser, repository, unit of work, or ORM layer. A future small native-driver example could be reconsidered if users cannot compose the existing documented path; a full starter requires separate evidence.

## Remaining uncertainty and human decision

Not evaluated: stored procedures, bulk loading, array/table-valued parameters, custom type parsers, time-zone configuration, retry semantics under faults, and DBMS-specific static parameter/result contract derivation. The scope expressly excludes adding those features now.

There is no deterministic blocker to report for the evaluated baseline. The only decision requested from a human is whether the observed MySQL/SQL Server distribution friction warrants a later documentation/example task. No implementation is included here.

## Reproduction

Build the five existing packages used by the harness, start isolated PostgreSQL 18, MySQL 8.4, and SQL Server 2022 instances, then set `PG_URL`, `MYSQL_URL`, `MSSQL_CONFIG`, and the explicit destructive-evaluation opt-in only for those isolated databases:

```sh
ASHIBA_DBMS_EVALUATION_ALLOW_DESTRUCTIVE=1 node docs/evaluations/dbms-compatibility/evaluation/dbms-compatibility.mjs
```

The harness overwrites only `raw-results.json`; it creates and removes only `ashiba_dbms_eval_*` tables in the evaluation databases. It refuses to run without the explicit opt-in. The evaluation containers were removed after the recorded run.
