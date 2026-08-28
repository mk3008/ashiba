# DDL Docs Ownership Decision

## Decision

**REHOME-TO-TRANSFER**

- Interpretation: Logical ownership rehome.
- Operational status: **DETACHED-FROM-ASHIBA / TEMPORARILY COLOCATED**.
- Product ownership: Transfer, where useful.
- Ashiba product responsibility: none.
- Physical relocation: deferred.
- Likely future: extract the tooling with Transfer to a dedicated repository.

`REHOME-TO-TRANSFER` does not require moving `packages/ddl-docs-cli` now. The
current directory and private package boundary may remain as temporary build
isolation. Repository location is not product ownership.

## Product-family boundary

Transfer is an experimental sibling product, not part of the current Ashiba
product family. `ddl-docs-cli` is Transfer-owned experimental tooling. Both are
historical SQL-first toolchain experiments that remain in the Ashiba monorepo
for transitional convenience.

Current Ashiba family covers the current Ashiba product packages, named
parameter/binding responsibility, current CLI mechanical SQL verification,
optional supported driver/package surfaces, and surfaces required by the
current Golden Path or explicitly retained. Transfer and its DDL-docs support
tooling are outside that family.

Historically, co-location was natural while Ashiba broadly explored SQL tooling,
application generation, testing, DDL/review tooling, and Transfer experiments.
As Ashiba narrowed toward the mechanical SQL/binding/verification boundary,
that reason largely disappeared. Current co-location therefore does not imply
current Ashiba ownership.

## Dependency direction

`Transfer -> Ashiba packages` is allowed: Transfer may consume Ashiba as an
experimental product. The reverse direction, `Ashiba product -> Transfer-specific
product/tooling`, is not intended. A future logical detach should leave Ashiba
core/product build, docs, and verification independent of Transfer and
`ddl-docs-cli`. This evaluation does not implement that separation.

## Why physical relocation is deferred

Current behavior works; location is not a product bug; relocation alone adds no
user value; moving now would create repository churn; and a move is more natural
if Transfer is later extracted. Ownership can be defined without paying the
one-time relocation cost now. This is not a compatibility-preservation reason.

The names `@ashiba-ts/ddl-docs-cli` and `@ashiba-ts/transfer-dogfood` are
historical namespaces. They are private packages, likely extraction candidates,
and an interim rename could create a double migration. Rename is deferred.
Package-local `AGENTS.md` is temporarily colocated experimental-tooling guidance,
not Ashiba product-distributed AI behavior; it may move with Transfer later.

## Deterministic value retained

Stale table/column/index/constraint checks, DDL ordering, relationship
validation, and review-plan mapping retain deterministic value. The conclusion
is **useful to Transfer but not owned by Ashiba**, not that the capabilities are
valueless. Do not promote them into a generic Ashiba DDL metadata, ConceptSpec,
review-plan, DFD, or policy framework without multiple independent non-Transfer
consumers.

## Future target direction

A likely, non-committed direction is:

```text
ashiba repository
  +-- Ashiba product
  +-- [temporary] Transfer experimental product
        +-- ddl-docs tooling

likely future:

ashiba repository
  +-- Ashiba product

transfer repository
  +-- Transfer
  +-- ddl-docs tooling
```

This is a candidate extraction direction, not a roadmap commitment. Transfer's
value, deletion, and repository-extraction implementation are out of scope.

## Evidence and reconsideration

The rehome experiment proves that the current physical package/filesystem
boundary is optional and that future extraction is feasible. It does not create
an immediate migration obligation or decide Transfer's minimal retained subset.

Reconsider Ashiba product ownership only when multiple independent non-Transfer
products require the same small invariant, or an independently valuable stable
cross-product guard is demonstrated. Generic documentation convenience is not a
trigger.
