# Driver Surface Final Reduction — Implementation Report

## Scope and invariant

Starting point: `08b9f0bff7310a6ff778831abcca4cabce9ee75a`.

This implementation applies already-decided removals. It does not change the
Golden Path:

```text
canonical SQL
→ deterministic binding metadata
→ bindNamedParameters
→ native driver
→ optional PostgreSQL contract
→ application/live tests
```

PostgreSQL/pg remains PRIMARY; MySQL/mysql2 and SQL Server/mssql remain
SUPPORTED-SECONDARY. Scope is unchanged.

## Removed runtime ownership

- Removed `@ashiba-ts/driver-adapter-core` and
  `@ashiba-ts/driver-adapter-pg`, including their public APIs, preparation
  implementation, tests, package metadata, and publish surface.
- Removed PostgreSQL ordinary preparation, safe-sort insertion, optional
  condition compression, generic runtime source-hash validation, execution
  event ownership, and preparation-level contract-profile validation.
- Removed `ashiba query optional add`, `refresh`, and `remove`, their
  rewriter, coordinate metadata generation, catalog entries, and tests.
- Removed generated safe-sort and optional-condition-compression metadata from
  `model-gen` output. Binding metadata, source hash, DBMS lowering, and
  `model-gen --check` remain.

No compatibility package, forwarding wrapper, hidden command, old-format
reader, or generic replacement preparation layer was added.

## Consumer migration

### Support Inbox

The application now binds generated PostgreSQL metadata directly with
`bindNamedParameters`, then calls its application-owned native `pg` pool.
Application code owns logging, masking, transaction boundaries, row
cardinality, and pool lifecycle.

Optional filters stay as visible nullable guards in canonical SQL. The list
screen's public sort inputs are accepted only by an application-owned finite
mapping; canonical SQL selects among reviewed sort values and retains a stable
`ticket_id` suffix. Raw request text is not concatenated into SQL.

The previous runtime source-hash failure UX was removed because source identity
for ordinary execution is now a build-time freshness responsibility. The
application's physical PostgreSQL route tests remain the final behavioral
authority.

### Transfer

Detached experimental Transfer was migrated only enough to stay buildable:
its local SQL client now uses binding metadata and `bindNamedParameters`
directly. No Transfer ownership or product-direction decision was made.

## Remaining ownership

- `@ashiba-ts/named-parameters` retains deterministic named binding,
  missing/unused rejection, and DBMS-specific lowering.
- CLI `model-gen` retains binding generation and freshness plus independent
  result/contract-related metadata responsibilities.
- Standalone `ashiba postgres-contract write|check` retains optional
  PostgreSQL-derived mechanical proof. It is outside runtime preparation.
- Any source identity required by a retained contract remains at that consumer
  boundary; no generic runtime gate remains.

## Migration impact

See [Driver surface migration](../../guide/driver-adapter-migration.md) for
ordinary PostgreSQL execution, named binding, visible optional filters, finite
sort mappings, application logging/transactions, and the standalone contract.

The removal is intentionally breaking. Existing consumers must move to their
native driver boundary; no adapter compatibility path is supplied.

## Verification

Passed:

- `pnpm typecheck`, `pnpm build`, `pnpm test`, `pnpm verify`, and
  `pnpm docs:build`;
- `pnpm verify:transfer` for the detached experimental consumer;
- PostgreSQL CLI live verification (2 tests);
- Ticket Queue's native reference verification (4 live tests, 4 contracts,
  and 3 negative controls);
- Support Inbox DB-backed verification (42 tests), including its route,
  filtering, reviewed sort, and transaction boundaries;
- named-parameter tests (8 tests), model-gen freshness checks, MySQL/MSSQL
  binding output inspection, and the CI-equivalent CRLF-only SQL check.

The Docker Compose Ticket Queue database setup could not allocate a new Docker
network because the host's predefined address pools were exhausted. The same
reference verification passed against an isolated temporary PostgreSQL
database on the already-running test container. Both temporary databases were
then dropped; no product database or schema was changed.

## Known limitation

Optional-condition compression's fail-closed stale-coordinate proof is
intentionally gone. Ordinary SQL review plus application/integration/live
tests now detect filter and sort behavior. This is the accepted trade-off from
the completed ownership evaluation.
