---
title: Runtime Boundary
---

# Runtime Boundary

Ashiba is a SQL-first scaffold and verification layer for TypeScript applications.

The short version:

- the `.sql` file is the canonical source
- the CLI generator is not in the runtime path
- generated `query.sql.ts` is a runtime snapshot, not the source of truth
- native database drivers own baseline runtime execution
- applications may optionally use Ashiba deterministic preparation or an
  adapter convenience surface
- Ashiba does not add an ORM runtime or hidden SQL DSL

## No ORM Runtime

Ashiba does not provide entities, relation loading, lazy loading, unit of work, dirty tracking, implicit relation traversal, or a runtime model owner.

Your application still owns:

- SQL files
- feature workflows
- transaction composition
- business validation
- route, CLI, worker, or batch adapters
- operational logging policy

Ashiba generates support artifacts around the SQL so humans and AI agents can review the persistence boundary without turning the application into an ORM-controlled runtime.

## Native Driver Baseline And Optional Ashiba Convenience

The CLI generator is development-time tooling. It scaffolds, analyzes, refreshes, tests, and checks SQL contracts.

At runtime, applications normally own a native database client, pool,
transaction, and `query(sql, values)` call. Ashiba may deterministically prepare
reviewed SQL text into driver SQL and ordered values.

### Minimal named-SQL path

For canonical SQL that uses named application values, the smallest ordinary
path is:

```text
canonical .sql
  -> build-time named lowering
  -> generated driver SQL + ordered parameter names
  -> @ashiba-ts/named-parameters bind
  -> native driver query(sql, values)
```

`@ashiba-ts/named-parameters/compiler` performs build-time lowering.
`@ashiba-ts/named-parameters` only validates names and creates ordered values;
it never parses or rewrites SQL at runtime. The application owns its pool,
client, transaction, commit/rollback, and business semantics.

Optional adapters may delegate execution to an application-supplied native
driver. For PostgreSQL, `@ashiba-ts/driver-adapter-pg` is an optional
compatibility/convenience surface for metadata-backed or advanced behavior:

- parameter contract checks
- source-hash checks
- metadata-backed optional-condition compression
- metadata-backed safe sort
- observer events for logging
- transient DB error classification for caller-owned retry policies

The optional adapter still executes SQL through the wrapped driver. It does not
expose a SQL builder DSL, ORM model, object graph, or relation loader. It is not
the normal required Ashiba runtime architecture, and it does not acquire
connections, manage pools or transactions, or own application execution policy.

## Named Parameters Preserve Driver Parameterization

Canonical application values use meaningful named parameters. A DB/driver
ecosystem that naturally supports named parameters keeps its native syntax; if
it does not, `:name` is the canonical fallback. Deterministic preparation may
lower that syntax to the driver's parameter form and a separate values array:

```ts
import { bindNamedParameters } from '@ashiba-ts/named-parameters';

const prepared = bindNamedParameters(generatedStatement, params, { strict: true });
await nativeDriver.query(prepared.sql, prepared.values);
```

Lowering never turns application values into SQL literals. It must not use
interpolation, quoting, escaping, or hard-coded substitution in the SQL text;
values remain separate until the native driver boundary. This does not make an
Ashiba adapter mandatory—the prepared SQL and values go directly to the native
driver. Adapter preparation is a separate optional route when an application
chooses metadata-backed compression, safe sorting, observation, or retry
classification.

## SQL Text At Runtime

Canonical SQL is normally file-backed for review and development tooling, but a
canonical file does not imply that application runtime code calls `node:fs`.
Runtime surfaces accept SQL as data. The application or its build tooling owns
loading, bundling, embedding, or otherwise supplying that text, and may attach
an optional source path for logs. Ashiba's CLI may use filesystem access during
development-time generation and verification.

Ashiba does not thereby claim support for every edge or lightweight runtime.
Driver compatibility remains an application-selected concern. The portability
rule is narrower: Ashiba itself does not require filesystem access merely to
load a canonical SQL asset at runtime.

Ashiba-provided runtime examples and scaffolds should likewise prefer SQL text
supplied without runtime filesystem access, unless an example explicitly
targets a Node/filesystem-specific environment. This does not prohibit an
application from choosing filesystem loading for its own Node runtime.

### Runtime Node built-in audit

| Classification | Current observation | Consequence |
| --- | --- | --- |
| A. Development-time only | `@ashiba-ts/cli` and DDL documentation tooling import `node:fs`, `node:path`, `node:child_process`, and related built-ins for generation, discovery, and verification. | Not a runtime SQL-loading requirement. |
| B. Application-selected driver | Database drivers are peer/application choices (`pg`, `mysql2`, `mssql`); their compatibility is not claimed by Ashiba. | Application-owned. |
| C. Ashiba runtime incidental | Current driver-adapter packages import `node:crypto` for source hashes and execution IDs; they do not import `node:fs`. | Optional adapter surfaces remain Node-oriented; any reduction of `node:crypto` is a follow-up, not an edge-runtime support claim. |

## Visible Retry Boundary

Optional Ashiba adapters may help applications handle transient database failures, but retry must stay visible.

`@ashiba-ts/driver-adapter-core` provides `withAshibaRetry`, a small helper for caller-owned retry loops. It retries only when the caller passes an explicit `retryOn` classifier. The final error is rethrown as-is, and retry / give-up events can be observed by application logging.

`@ashiba-ts/driver-adapter-pg` provides `classifyPostgresTransientError` and `isPostgresTransientError` for common PostgreSQL SQLSTATE and connection failures such as serialization failure, deadlock, shutdown, connection failure, and transient network errors.

Example:

```ts
import { withAshibaRetry } from '@ashiba-ts/driver-adapter-core';
import { classifyPostgresTransientError } from '@ashiba-ts/driver-adapter-pg';

await withAshibaRetry(
  {
    maxAttempts: 3,
    retryOn(error) {
      const result = classifyPostgresTransientError(error);
      return { retry: result.retryable, reason: result.reason };
    },
  },
  async () => {
    // Application-owned transaction or query boundary call.
  },
);
```

This is intentionally not hidden automatic retry. Application code still owns:

- whether the operation is safe to run again
- transaction scope
- idempotency keys or optimistic locking
- external side effects
- SAGA / compensation workflows
- how retries are logged, alerted, and capped

Do not use an adapter retry helper to silently re-run arbitrary mutations after the application has performed non-database side effects. For commit-unknown or compensation-heavy workflows, keep the retry decision in application/SAGA code and use the driver classifier only as one input.

## Feature Query Boundary

Generated feature query code depends on the shared `FeatureQueryExecutor` contract from `@ashiba-ts/driver-adapter-core`.

Existing projects that choose the optional execution boundary helpers should add `@ashiba-ts/driver-adapter-core` as a direct dependency before scaffolding new query boundaries.

That contract is intentionally small:

```ts
export interface FeatureQueryExecutor<Query extends AnyFeatureQuerySource> {
  query(
    query: Query,
    params: AshibaQueryParams<Query>,
  ): Promise<AshibaQueryRow<Query>[]>;
}
```

Generated feature boundaries may receive this optional convenience contract.
Applications may instead keep the native driver directly visible; Ashiba does
not prescribe either application architecture.

The Params/Row link is a compile-time contract derived from visible SQL and available DDL facts; optional Ashiba adapters do not validate every returned value at runtime. Unproved expressions remain `unknown` instead of accepting a caller-supplied result generic. PostgreSQL contracts follow default `pg` representations: `bigint`, `numeric`, and `count(...)` are strings unless source SQL explicitly casts them to another database type. Applications that install custom `pg` type parsers must keep that conversion visible at their driver/application boundary or express the intended type with a reviewed SQL cast.

For convenience, `@ashiba-ts/driver-adapter-core` also provides cardinality helpers:

- `queryMany` returns all rows
- `queryOne` requires exactly one row
- `queryOneOrNull` allows zero rows and rejects multiple rows

These helpers do not change SQL meaning. They only make row cardinality expectations explicit at the feature boundary. Scaffolded `insert ... returning` queries use `queryOne` by default. Scaffolded `update` and `delete` queries use `queryMany` by default so application-owned workflow code can interpret zero affected/returned rows, including optimistic-lock conflict cases.

## Dialect Binding Metadata

`FeatureQueryModel` is shared by optional feature query boundaries and adapter
surfaces. It has dialect binding slots for PostgreSQL, mysql2, mssql, and
future SQLite-compatible adapters.

PostgreSQL is the most complete runtime binding today because it supports metadata-backed safe sort and optional-condition compression. The shared core type is intentionally dialect-extensible so additional adapters can add their own binding metadata without turning the query model into an ORM model.

## Metadata-Backed Runtime Rewrites

Ashiba allows a small set of runtime rewrites only when they are backed by CLI-generated metadata.

Allowed adapter rewrites include:

- optional-condition compression from SSSQL metadata
- safe sort insertion from reviewed sort metadata

These are not arbitrary SQL string builders. The adapter must have:

- the original source SQL
- generated query metadata
- dialect binding metadata
- matching source hashes
- reviewed ranges or insertion positions

If the SQL and metadata are stale or inconsistent, execution must fail before the wrapped driver is called.

## Canonical SQL And Runtime Snapshots

The `.sql` file is the canonical source. Review, edit, explain, and run that file in a SQL client.

Generated files have narrower roles:

| File | Role | Edit policy |
|---|---|---|
| `query.sql.ts` | generated SQL-text snapshot; one runtime supply option | generated, do not edit by hand |
| `query.meta.ts` | query model, source hash, binding metadata, safe rewrite metadata | generated, do not edit by hand |
| `query.ts` | feature query boundary that chooses source, params, result type, and cardinality helper | application-owned after generation |

After SQL or DDL edits, refresh generated-owned artifacts and receive one list of application-owned contract work:

```bash
npx ashiba check --fix-generated
```

The command may update `query.sql.ts`, `query.meta.ts`, and generated mapper-test assets. It never edits canonical SQL or application-owned `query.ts`. `ashiba check` and related query checks reject mismatches between those layers.
