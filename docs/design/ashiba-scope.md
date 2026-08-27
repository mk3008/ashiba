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

## Durable ownership and maintenance surface

A capability is not justified merely because Ashiba can implement it. A proposal
must justify why Ashiba should permanently own the capability, including its
maintenance and compatibility surface. **Maintenance Surface** means the durable
things Ashiba or its users must continue to understand, update, test, support,
or migrate: public APIs, packages, CLIs and concepts; DBMS, driver and version
coupling; external or private dependencies; CI and live-environment matrices;
generated artifacts and freshness contracts; documentation, examples, Skills
and configuration; compatibility promises; removal/migration cost; and failure
modes Ashiba must continue to own. It is not a LOC measure or a numeric score.

When ordinary SQL, DDL, native-driver APIs, or small application glue can be
reconstructed reliably by an application developer or AI agent, Ashiba does not
automatically turn that work into a permanent framework, CLI, adapter, Skill,
DSL, or API. Repeated generation cost alone is insufficient evidence for product
ownership. Conversely, Ashiba preferentially owns narrow responsibilities where
the fact is mechanically decidable, failure matters, deterministic verification
is practical, and centralizing the invariant reduces total ownership cost. A
small verifier can therefore be worth owning where a broad convenience
abstraction is not.

Moving responsibility between code, Skills, configuration, generated metadata,
CLI, CI, documentation, or compatibility adapters does not remove its
maintenance cost. Ashiba's AI-native direction is not to maximize AI-facing
features: application or AI may reconstruct implementation or knowledge when
needed, while Ashiba may retain narrow deterministic guards where repeated
reasoning is a poor substitute for proof. This remains evidence-driven; a
permanent abstraction is valid when its durable value exceeds its durable
ownership cost. Zero dependencies, fewer lines, or AI-generated code are not
inherently better or automatically safe, and deterministic verification does not
replace application tests. Not every valid feature must be mechanically provable.

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
permanent responsibility, evidence that repeated reconstruction is insufficient,
the deterministic value Ashiba uniquely adds, introduced maintenance surfaces,
external/version-specific behavior to track, simpler application-owned or
AI-reconstructed alternatives, and the consequence of later removal. This is a
concise burden of proof, not a new governance process; implementation convenience
is not an existing mandate.

## Evidence and follow-up

This boundary consolidates PRs #62--#68. Their partial and
productization-pending conclusions remain evidence, not automatic contracts.
Recent distribution-surface, CTE-shadowing, physical SQL-logic-isolation,
native-driver DBMS-compatibility, and DBMS-contract-verification evaluations
provide supporting cases where a technically possible abstraction was not
adopted, application/native-driver ownership was cheaper, deterministic core
generalized, or DBMS-specific verification ownership was rejected. They are not
universal laws. A current-product mismatch is a follow-up decision, not a silent
rewrite mandate.
