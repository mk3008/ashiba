---
title: Runtime Boundary
---

# Runtime Boundary

Ashiba is a SQL-first scaffold and verification layer for TypeScript applications.

The short version:

- the `.sql` file is the canonical source
- the CLI generator is not in the runtime path
- generated `query.sql.ts` is a runtime snapshot, not the source of truth
- applications may use a selected thin SQL execution adapter
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

## Thin SQL Execution Adapter

The CLI generator is development-time tooling. It scaffolds, analyzes, refreshes, tests, and checks SQL contracts.

At runtime, the selected driver adapter can be used as a thin SQL execution boundary. For PostgreSQL, `@ashiba-ts/driver-adapter-pg` wraps a `pg`-compatible client or pool and owns narrow execution concerns:

- named-parameter binding
- parameter contract checks
- source-hash checks
- metadata-backed optional-condition compression
- metadata-backed safe sort
- observer events for logging
- transient DB error classification for caller-owned retry policies

The adapter still executes SQL through the wrapped driver. It does not expose a SQL builder DSL, ORM model, object graph, or relation loader.

## Visible Retry Boundary

Thin drivers may help applications handle transient database failures, but retry must stay visible.

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

Do not use a thin-driver retry helper to silently re-run arbitrary mutations after the application has performed non-database side effects. For commit-unknown or compensation-heavy workflows, keep the retry decision in application/SAGA code and use the driver classifier only as one input.

## Feature Query Boundary

Generated feature query code depends on the shared `FeatureQueryExecutor` contract from `@ashiba-ts/driver-adapter-core`.

Existing projects created before the thin execution boundary helpers should add `@ashiba-ts/driver-adapter-core` as a direct dependency before scaffolding new query boundaries.

That contract is intentionally small:

```ts
export interface FeatureQueryExecutor {
  query<T = unknown>(query: FeatureQuerySource, params: Record<string, unknown>): Promise<T[]>;
}
```

Feature code receives this boundary instead of importing `pg`, the concrete driver adapter, or logger packages directly.

For convenience, `@ashiba-ts/driver-adapter-core` also provides cardinality helpers:

- `queryMany` returns all rows
- `queryOne` requires exactly one row
- `queryOneOrNull` allows zero rows and rejects multiple rows

These helpers do not change SQL meaning. They only make row cardinality expectations explicit at the feature boundary. Scaffolded `insert ... returning` queries use `queryOne` by default. Scaffolded `update` and `delete` queries use `queryMany` by default so application-owned workflow code can interpret zero affected/returned rows, including optimistic-lock conflict cases.

## Dialect Binding Metadata

`FeatureQueryModel` is shared by feature query boundaries and thin adapters. It has dialect binding slots for PostgreSQL, mysql2, mssql, and future SQLite-compatible adapters.

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
| `query.sql.ts` | runtime snapshot of the canonical SQL | generated, do not edit by hand |
| `query.meta.ts` | query model, source hash, binding metadata, safe rewrite metadata | generated, do not edit by hand |
| `query.ts` | feature query boundary that chooses source, params, result type, and cardinality helper | application-owned after generation |

After SQL-only edits, run refresh/check so `.sql`, `query.sql.ts`, and `query.meta.ts` stay synchronized:

```bash
npx ashiba feature query refresh <feature> <query>
npx ashiba check
```

`ashiba check` and related query checks are responsible for detecting mismatches between canonical SQL, runtime snapshots, metadata, and generated mapper-test assets.
