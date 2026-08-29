# Builder Mapper Core Realignment Implementation

Starting SHA: `2d5176407a567bdf5f75d28479cf0c6a4ba4436c`

## Outcome

Ashiba now concentrates its current product surface on the Builder Mapper boundary:

```text
canonical raw SQL
  -> deterministic named binding metadata and freshness
  -> bindNamedParameters
  -> application-owned native driver
```

Applications may compose a reviewed SQL literal selected from a closed finite input set. They must not turn unbounded external input into SQL syntax.

Scope, the Golden Path, and DBMS positioning are unchanged. Named binding, model generation, DDL-backed lint, query uses, SQL-resource comparison, and the optional PostgreSQL contract are unchanged.

## Consumer census and migration removal

The pre-change census found `ashiba ddl migration generate` only in the CLI registration/catalog, `commands/ddl.ts`, `ddl-diff/**`, migration-specific tests, a current guide, one Support Inbox exercise, and a promo renderer. There was no current runtime, CI, standard verification, Ticket Queue, SQL-resource, DDL-lint, query-uses, or PostgreSQL-contract consumer.

This change removes the command, the whole migration-only `ddl-diff` surface, `DdlApplyPlan`/`ApplyPlanOperation`, the migration risk model, the exercise, and the promo script. No compatibility command, alias, forwarding wrapper, or replacement migration framework is retained.

The current migration boundary is documented in [`docs/guide/change-safety-migration.md`](../../guide/change-safety-migration.md): use dedicated migration tooling, native database tooling, or application-owned reviewed SQL migrations. Ashiba can still read DDL as an optional verification input; migration authoring, apply/rollback, history, deployment, credentials, and scheduling remain external or application-owned.

## Support Inbox finite sort composition

The Support Inbox list query previously used a 337-line canonical SQL file with 120 `CASE` ordering branches across four parameter slots. It now has a 217-line canonical SQL body with a stable `ticket_id` order anchor. The application owns a 15-key, 30-literal reviewed mapping in the query module and composes only a selected literal into both the inspected canonical query and the lowered PostgreSQL binding SQL.

The mapping preserves six business presets, column ordering, ascending and descending directions, multi-sort ordering, current query-string normalization, pagination, and a stable `ticket_id` tie-breaker within the four-term maximum. Request parsing drops unknown, invalid, hostile, and duplicate column inputs before execution. The composition boundary independently rejects unknown keys, invalid directions, duplicates, and more than four sort terms. It never interpolates the raw request value into SQL.

Canonical binding metadata still covers the stable query body and all value parameters. Dynamic ordering is explicit application-owned policy rather than an untracked Ashiba runtime transformation; removing `sort_1` through `sort_4` reduced the generated PostgreSQL binding parameter set from 13 to 9.

Review-cost evidence:

| Measure | Before | After |
| --- | ---: | ---: |
| Canonical query SQL lines | 337 | 217 |
| CASE ordering terms | 120 | 0 |
| Reviewed ordering literals | 0 encoded in SQL matrix | 30 in an application-owned finite map |
| New sort key touch locations | SQL matrix, parameters, metadata, tests | finite map and focused tests |

Focused tests cover accepted ascending/descending reviewed terms, precedence, the stable suffix, unknown/hostile keys, invalid directions, duplicate keys, the maximum count, and the absence of `sort_1` in generated binding metadata.

## Boundary after implementation

| Classification | Capabilities |
| --- | --- |
| Core | Canonical raw SQL; named binding; metadata/freshness; application-owned finite reviewed composition; native driver handoff. |
| Optional proof, unchanged | DDL-backed lint; query uses; SQL-resource snapshot/compare; standalone PostgreSQL contract. |
| External/application-owned | Pools, transactions, logging, result mapping, business policy, migration lifecycle, schema pull, deployment, and CI. |

## Limitations

The finite map is intentionally Support Inbox-specific; it is not a generic query builder or a replacement Safe Sort runtime. Adding a materially distinct query shape should prefer a visible query variant over extending this mapping. The dynamic literal policy requires ordinary application review and tests; binding metadata does not claim to prove the selected business ordering.

## Reproduction and verification

Run the focused Support Inbox test suite with:

```sh
pnpm --filter ashiba-hono-pg-support-inbox-demo test
```

The focused Support Inbox PostgreSQL suite passed 49 tests. `pnpm typecheck`,
`pnpm build`, `pnpm test`, `pnpm verify`, `pnpm docs:build`, and
`git diff --check` passed. The standard verify also passed publish-order,
consumer-install, Docker tutorial, and customer-functional proofs. The
temporary Support Inbox PostgreSQL container and `.env` were removed after the
live run. Exact outcomes, remote CI, cleanup, and orchestration metrics are
recorded in `raw-results.json`.
