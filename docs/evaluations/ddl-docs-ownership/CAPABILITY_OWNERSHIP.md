# Capability Ownership

| Capability | Implemented | Transfer uses? | Other current consumer? | Classification | Ownership conclusion |
|---|---:|---:|---:|---|---|
| DDL parsing and table/column Markdown | yes | yes | no | B | Useful rendering convenience; Transfer experimental product-owned output shape. |
| `check`: stale table/column/index/constraint refs and invalid metadata | yes | yes | no | C | Deterministic failure prevention owned by the Transfer experimental product; not Ashiba product responsibility. |
| DDL order checking | yes | yes | no | C | Deterministic and useful; the ordered DDL manifest is Transfer experimental product-owned. |
| Relationships, Concept, DFD, and Process pages | yes | yes | no | C | Transfer experimental product review system, not Ashiba SQL tooling. |
| Scope, test, authority, and technology rules | yes | yes | no | C | Transfer experimental product policy, outside Ashiba product responsibility. |
| `review-plan` | yes | yes | no | C | Maps Transfer artifacts and policies; Transfer experimental product-owned. |
| Structured Concept build | yes | yes | no | C | Current script uses it only for Transfer concepts; Transfer experimental product-owned. |
| Concept display-name mutation | yes | no | no | D | Generic command with no current Transfer script use. |
| Generic input modes, prune, and minimal E2E example | yes | no | no | B/D | Tooling convenience/demonstration; no current product consumer evidence. |

`A` means a general current Ashiba SQL/DDL mechanical responsibility; `B`
generic documentation convenience; `C` Transfer experimental product-owned
review/tooling responsibility; `D` historical or currently unconsumed residue.
No current capability has sufficient evidence for category A.

## Deterministic value

Stale table/column/index/constraint detection, DDL ordering, relationship
validation, and review-plan mapping have real deterministic value. The ownership
conclusion is **useful to Transfer but not owned by Ashiba**, not that these
checks should be discarded.

## No generic-guard promotion

Mechanical decidability alone does not justify an Ashiba DDL metadata framework,
generic ConceptSpec validator, generic review-plan engine, generic DFD validator,
or generic policy checker. Current inputs, schemas, error vocabulary, and review
meaning are Transfer-specific. Keep them Transfer-local until multiple
independent non-Transfer consumers demonstrate a stable cross-product contract.
