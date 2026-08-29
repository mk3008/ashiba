# Remaining Change-Safety Surface Durable Ownership Evaluation

Starting SHA: `defcf2b6ac0a205c26a343d0e39d0c9f12cd24b9`.

## Decision

**Overall: REDUCE.**

| Capability | Decision | Reason |
| --- | --- | --- |
| `ddl migration generate` | KEEP | It deterministically AST-diffs DDL snapshots, emits stable review SQL and explicit destructive/ambiguous risk, and fails closed on unsupported DDL. It never applies a migration or proves semantic rename intent. |
| `sql-resource snapshot` | KEEP | It is the source-derived half of a fleet-level PostgreSQL contract artifact; snapshot freshness/error state is explicit. |
| `sql-resource compare` | KEEP | It deterministically compares a complete saved fleet and marks unsupported change as `needs-review`; ordinary source hash, model-gen, query uses, and one-query contract checks do not provide this aggregate comparison. |
| `gate scaffold` | REMOVE | It only writes project-local package scripts, CI YAML, and hook snippets. No current consumer or independent mechanical proof was found; AI/project-local scripts can reconstruct it. |
| `@ashiba-ts/ddl-pull-pg-dump` | REMOVE | It is a thin `pg_dump` process wrapper with argument construction and redacted diagnostics. Native `pg_dump` or a project script owns the same schema pull; no current consumer exists. |

## Current consumers

No target is part of the Golden Path or directly invoked by root `verify`.
`ddl migration generate` has one Support Inbox exercise plus README/promo promotion.
SQL-resource has a current guide and unit/live tests, but no application or CI
consumer. Gate scaffold has only source/catalog/README promotion. The pg-dump
package has no external import, CLI, CI, example, dogfood, or Transfer consumer;
workspace membership is not a product consumer.

## Failure prevention versus convenience

DDL migration generation supplies deterministic snapshot comparison, ordered
output, and explicit risk instead of a migration platform. SQL-resource's
snapshot/compare pair supplies a stable machine-readable PostgreSQL fleet
comparison, including execution-breaking/contract-changed/needs-review states.
Those retained primitives are optional review proof, not final behavioral
authority: application migration review/apply and application/live tests remain
owners. Gate scaffold and pg_dump wrapping only make setup or invocation
shorter; they neither add exhaustive proof nor prevent a failure unavailable to
native tooling and project code.

## Overlap and retained primitive boundary

`model-gen` owns per-query binding freshness; the standalone PostgreSQL contract
owns optional per-query DB facts; query uses owns impact discovery; narrow lint
owns DDL-backed local consistency. SQL-resource reuses those inputs but adds the
only current fleet snapshot comparison. DDL migration generation owns only DDL
snapshot diff/risk rendering. No integrated Ashiba database lifecycle toolchain
is justified.

## Maintenance and reconstructibility

Retained commands carry AST/dialect/risk classification, contract artifact, and
compatibility responsibilities. They must stay narrow and optional. Scaffold
templates carry package-manager, CI, hook, and generated-file update cost without
proof. The pg-dump package carries external executable/version/flag/platform
compatibility without an Ashiba-specific guarantee. Both removed candidates are
highly reconstructible by AI plus native/project tooling.

## Compatibility and follow-up

This evaluation authorizes a later breaking implementation PR to remove gate
scaffold and `@ashiba-ts/ddl-pull-pg-dump`, with short migration notes to use
project-local scripts/CI and native `pg_dump`. It does not authorize changes to
the retained primitives, Scope, Golden Path, DBMS positioning, named binding,
model-gen, query uses, narrow DDL lint, or standalone PostgreSQL contract.

## Evidence strength and limitations

Evidence strength: **medium**. Source-level behavior, tests, docs, and consumer
census are clear. Limitations: no external adoption census; current retained
commands have limited real consumer evidence; no new destructive/live benchmark
was run because no product behavior changed. Reconsider retention if native/AI
workflows repeatedly miss a measurable fleet/DDL proof; reconsider removal if
multiple independent products demonstrate the same contract need.

## Invariants and verification

Scope change required: no. Golden Path changed: no. Product code changed: no.
Evaluation artifacts only. Repository verification and docs build are recorded
in `raw-results.json`.
