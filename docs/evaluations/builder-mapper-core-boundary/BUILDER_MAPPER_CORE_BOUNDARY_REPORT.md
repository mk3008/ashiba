# Builder Mapper Core Boundary Realignment Evaluation

## Decision

| Decision | Result |
| --- | --- |
| Dynamic sort | **CONTEXTUAL**: prefer finite reviewed literal composition for small bounded menus; prefer explicit query variants for bounded business shapes; do not expand CASE matrices by default. |
| Migration | **REMOVE-FROM-ASHIBA** |
| applyPlan | **REMOVE** |
| Architecture | **CORE-BOUNDARY-ACCEPTED** |

## Why this evaluation occurred

Ashiba has completed multiple surface reductions. This evaluation asks whether
the remaining architecture is aligned to a practical Builder Mapper core, not
whether another package can be removed. A healthy architecture permits native
drivers and focused external tooling instead of turning Ashiba into an
execution, migration, schema-pull, logging, or CI platform.

## Builder Mapper core

Ashiba owns the minimum deterministic bridge:

```text
canonical raw SQL
  -> named-parameter binding metadata and freshness
  -> bindNamedParameters
  -> application-owned native driver execution
```

The core makes SQL reviewable and prevents missing/unused named-value-set
mismatches. It does not own pool lifecycle, transaction, rollback, logging,
masking, cardinality, result mapping, migration application, deployment, or
business policy. Finite safe syntax selection is necessary as an application
pattern, but its terms remain application-owned reviewed literals rather than a
new generic Ashiba runtime.

## Strongest dynamic-sort evidence

Support Inbox uses a visible CASE matrix with four sort slots and a stable
tie-breaker. It works, but the canonical SQL is approximately 337 lines and
each new key/direction/slot creates broad patterned edits. Ticket Queue already
uses a smaller application-owned finite map: it validates at most three known
keys, `asc|desc`, duplicates, and appends `t.id asc` before passing ordinary
named parameters to native pg.

The evaluation's isolated negative control also rejects a hostile key,
unknown key, invalid direction, duplicate key, and excessive sort count before
any SQL reaches a driver. The former Safe Sort runtime's removal evidence
showed the same hostile-input boundary could be satisfied by rules-only maps;
it did not establish that CASE matrices are categorically safer. See
[finite comparison](./FINITE_SORT_COMPARISON.md) and
[safety model](./FINITE_SORT_SAFETY_MODEL.md).

## Strongest migration evidence

The additive `resolved_at` fixture generated only:

```sql
ALTER TABLE "tickets" ADD COLUMN "resolved_at" timestamptz NULL;
```

Its separate `applyPlan` nevertheless contained `drop_table_cascade`,
`recreate_table`, and `create_table`; the separate risk output returned
`semantic_constraint_change` and no operational risks. This is not evidence of
destructive generated SQL. It is evidence that three review representations do
not have one semantic authority, increasing review and compatibility cost.

Migration authoring/lifecycle is also not required to establish canonical SQL,
named binding, or metadata freshness. Dedicated migration tooling, native DB
tooling, application-owned SQL, and AI-assisted reviewable SQL are suitable
external/application owners. See [migration ownership](./MIGRATION_TIMELINE_AND_OWNERSHIP.md)
and [applyPlan analysis](./APPLY_PLAN_ANALYSIS.md).

## Maintenance-surface verdict

The retained core has direct deterministic necessity. Optional proofs remain
outside normal execution and should not be promoted merely because they exist.
Migration generation has a large permanent dialect/DDL/lifecycle matrix without
being a Builder Mapper prerequisite. `applyPlan` adds a second, inconsistent
operation model and has no identified runtime, standard-verify, CI, or machine
consumer.

## Current classification

The detailed CORE / OPTIONAL PROOF / EXTERNAL classification is in
[CURRENT_SURFACE_CLASSIFICATION.md](./CURRENT_SURFACE_CLASSIFICATION.md).

- **CORE:** canonical SQL; named compiler/binder; deterministic binding
  metadata and build-time freshness; native-driver handoff.
- **OPTIONAL PROOF:** query uses, narrow DDL-backed lint, optional PostgreSQL
  contract, SQL-resource snapshot/compare.
- **EXTERNAL / APPLICATION-OWNED:** pool/transaction/logging/mapping, business
  sort policy, migration lifecycle, schema pull, deployment and CI.
- **REMOVE target:** `ddl migration generate` and `applyPlan`, in a later
  breaking-change implementation task.

## Scope and invariants

- Scope change required: **no**.
- Golden Path changed: **no**.
- DBMS positioning changed: **no**. PostgreSQL/pg remains PRIMARY; mysql2 and
  mssql remain SUPPORTED-SECONDARY.
- Product code, public API, package topology, current product docs, and
  examples changed: **no**.

## Evidence strength and limitations

**Evidence strength: medium.** The conclusion uses current source/consumer
census, historical commits, current Ticket Queue and Support Inbox shapes, the
previous Dynamic Mechanism Value Ablation, and focused isolated negative
controls. It does not claim production frequency for every sort shape or audit
external adopters. No external migration tool was benchmarked; this is an
ownership boundary comparison, not a product ranking.

## Verification

Passed locally: isolated finite-sort control, exact migration JSON
reproduction, `pnpm verify`, `pnpm docs:build`, and `git diff --check`.

The PR's remote `Verify` workflow also passed: `verify`, `postgres-live`,
`postgres-ticket-queue-reference`, `support-inbox-example`, and
`support-inbox-example-autocrlf`. No database or container resource was created
by this evaluation; repository verification temporary resources were cleaned by
their scripts.

## Follow-up

Follow-up is implementation planning, not part of this evaluation: remove the
migration-generation/applyPlan surface with breaking migration guidance, and
separately apply contextual finite-sort guidance where an application is
authorized to change. Do not reconsider SQL-resource ownership unless a real
consumer or independent proof changes its current optional status.

See [Target Boundary and Follow-Up](./TARGET_BOUNDARY_AND_FOLLOW_UP.md) and
[Reproduction](./REPRODUCTION.md).
