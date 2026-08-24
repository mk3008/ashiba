---
title: Ashiba Scope
---

# Ashiba Scope

This document is the normative source of truth for Ashiba product scope.

Ashiba is a SQL-first development and verification product for TypeScript
applications. It keeps complete SQL visible and reviewable while supplying
narrow, evidence-backed preparation and verification where that adds value.
It is not an ORM, generic query builder, or application architecture framework.

## Maturity labels

This document distinguishes **settled boundary** (new proposals normally follow
it), **current decision** (adopted now but changeable with new evidence), and
**experimental / productization pending** (promising evaluation evidence, not a
product contract). Do not promote the last category by implication.

## Settled boundary

- Canonical SQL is a complete, independently reviewable source asset. A `.sql`
  file is the normal form, not a requirement for trivial SQL.
- Canonical SQL must be usable outside Ashiba: its query structure remains
  ordinary target-dialect SQL, can be reviewed or investigated in SQL tools,
  and can be brought from existing/external sources. This does not require
  unmodified execution in every SQL client: a target driver may need a small,
  mechanical placeholder conversion. Ashiba-specific query DSL, directives, or
  markers such as `&#123;&#123;optional(...)&#125;&#125;` are not part of canonical SQL, and the
  SQL asset remains usable if Ashiba is removed.
- Runtime does not freely construct SQL syntax from arbitrary fragments, and
  Ashiba core does not provide a generic query builder.
- Application-supplied values in canonical SQL must use meaningful named
  parameters. Use the selected DB/driver ecosystem's natural named syntax when
  it has one; where it does not, canonical SQL uses the `:name` convention.
  A native `@name`-style ecosystem is not forced through `:name`.
- When a native driver does not accept the canonical named syntax, deterministic
  lowering produces native parameterized SQL plus a separate ordered values
  collection (for example, PostgreSQL `:id` becomes `$1` and its value). The
  lowering must preserve parameterized execution: values remain separate from
  SQL text through the driver boundary and are never literal-interpolated,
  quoted, escaped, or substituted into SQL syntax.
- Application code owns connection/pool lifecycle, transactions, isolation,
  commit/rollback, retry and idempotency policy, logging, telemetry, type
  parsing, streams/cursors, business ordering, optional-filter semantics, DTO
  and domain architecture, and migration application policy.
- Native database drivers are the baseline runtime execution owner. Ashiba may
  provide deterministic preparation and optional adapters that delegate
  execution to an application-supplied native driver. Ashiba does not acquire
  connections, manage pools or transactions, or own application execution
  policy.
- Ashiba-specific execution adapters are optional compatibility or convenience
  surfaces, not required application architecture. They do not replace the
  native driver or own application execution policy.
- Canonical SQL being file-backed does not require runtime filesystem access.
  Applications/build tooling own loading, bundling, embedding, or otherwise
  supplying SQL text; development-time Ashiba tooling may use filesystem access.
- Ashiba-provided runtime examples and scaffolds prefer supplied SQL text
  without runtime filesystem access unless the example explicitly targets a
  Node/filesystem-specific environment. This does not restrict an application's
  own runtime loading choice.
- Valid ordinary SQL execution is not unnecessarily blocked when Ashiba cannot
  analyze it. A proof-required Ashiba transformation fails closed when its
  local evidence is stale, absent, or inconsistent.

## Current decisions

- Deterministic named-parameter lowering is the fallback responsibility when
  native driver support is insufficient; a runtime lexer is not the standard
  path.
- Optional input meanings (`omitted`, explicit `NULL`, value) are application
  requirements. Runtime does not add predicates. Precomputed predicate
  subtraction is a performance optimization: default off, query opt-in, and an
  execution-level off escape hatch.
- Reviewed ordering expressions, including CASE and multi-key composition, are
  application-owned. Runtime may select bounded key/direction/sequence input
  and mechanically place those expressions; it never accepts raw SQL ordering.
- Verification enforces mechanical facts it can establish, such as source
  identity, stale metadata, local range/context consistency, and binding
  metadata. Business semantics, transaction adequacy, domain policy, and test
  adequacy remain application/live-test authority.

## Experimental / productization pending

AI-derived per-query optional ranges and sort placement coordinates have
evaluation support only. Their generator is not prescribed: the trust boundary
is a versioned artifact contract, small deterministic verifier, and
application/live tests. Build-time AI is rejected for reproducible builds.
Productizing these artifacts, a CLI generator, or a broader runtime contract
requires separate evidence and an explicit scope decision.

## Explicit non-scope

Ashiba core does not own repository/unit-of-work/ORM relation abstractions,
application architecture policy, automatic transaction retries, logging or
telemetry backends, generic runtime SQL composition, business sort policy, or
application domain/DTO models. A proposal may extend scope, but must state the
new responsibility, evidence, value, and alternatives rather than treating an
implementation convenience as an existing mandate.

## Evidence and follow-up

This boundary consolidates PRs #62--#68. Their partial and
productization-pending conclusions remain evidence, not automatic contracts.
A current-product mismatch is a follow-up decision, not a silent rewrite mandate.
