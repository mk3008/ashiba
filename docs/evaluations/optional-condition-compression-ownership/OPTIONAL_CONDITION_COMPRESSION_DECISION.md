# Optional-Condition Compression Productization Decision

## Final decision

**`REMOVE`.**

Do not productize optional-condition compression as a permanent Ashiba
optional capability. Do not retain `driver-adapter-pg` or
`driver-adapter-core` to host it.

## Strongest evidence

* The stale-coordinate guard is real: five deliberate O-C stale mutations
  failed before execution; it was first detector in two of four fresh repairs.
* The final behavior authority remains application tests: O-A/O-B ordinary
  tests reached green in four of four repair trials, and no measured runtime
  outcome advantage for O-C was found.
* Artifact cost scales materially: O-C has 32.1x O-A bytes and six times files
  at 100 queries.
* Current use is one dogfood family plus detached Transfer, not multiple
  independent product consumers.

## Why not KEEP OPTIONAL

A minimal retained boundary would still need a PostgreSQL-specific rewrite API,
generated source/lowered coordinates, source identity, branch/range verifier,
placeholder renumbering, schema/version compatibility, focused tests, and
documentation. It would be smaller than the current adapter but not small
enough for the observed benefit. Creating that package would relocate rather
than remove Maintenance Surface.

## Scope and Golden Path

Scope change required: **no**. Golden Path changed: **no**. Product code
changed: **no**.

## Compatibility

Future removal is a breaking migration with a concise migration note. It must
not retain an empty package, deprecated alias, hidden runtime rewrite, or
generated-format compatibility reader solely for old coordinate artifacts.

## Reconsideration trigger

Reconsider only if all of the following change materially:

1. multiple independent applications need the same source/lowered-coordinate
   contract;
2. ordinary application/integration/live testing repeatedly fails to discover
   a measurable class of costly optional-filter mistakes; and
3. a narrow verifier demonstrates a durable benefit without reintroducing a
   broad adapter, authoring framework, or large generated artifact surface.

Convenience, AI generation, one dogfood consumer, or the existence of old
metadata is not sufficient.

## Follow-up implementation boundary

Create a separate removal PR. It should remove the runtime rewriter, generated
coordinate metadata, opt-in configuration, compression-specific CLI commands,
docs, tests, and residual core/pg types; migrate Support Inbox to ordinary
nullable guards or visible application variants with application-owned tests;
and preserve named binding and standalone PostgreSQL contract. Do not combine
this removal with unrelated named-parameter, contract, or DBMS support work.
