# Capability Ownership

| Capability | Implemented | Transfer uses? | Other current consumer? | Classification | Ownership conclusion |
|---|---:|---:|---:|---|---|
| DDL parsing and table/column Markdown | yes | yes | no | B | Useful rendering convenience; Transfer-local output shape. |
| `check`: stale table/column/index/constraint refs and invalid metadata | yes | yes | no | C | Deterministic failure prevention, but against Transfer metadata and review vocabulary. |
| DDL order checking | yes | yes | no | C | Deterministic and useful; the ordered DDL manifest is Transfer-local. |
| Relationships, Concept, DFD, and Process pages | yes | yes | no | C | Transfer review system, not Ashiba SQL tooling. |
| Scope, test, authority, and technology rules | yes | yes | no | C | Application review policy, outside Ashiba product responsibility. |
| `review-plan` | yes | yes | no | C | Maps Transfer artifacts and policies; Transfer-local. |
| Structured Concept build | yes | yes | no | C | Current script uses it only for Transfer concepts. |
| Concept display-name mutation | yes | no | no | D | Generic command with no current Transfer script use. |
| Generic input modes, prune, and minimal E2E example | yes | no | no | B/D | Package convenience and package demonstration; no current consumer evidence. |

`A` means a general Ashiba SQL/DDL mechanical responsibility; `B` generic
documentation convenience; `C` Transfer/application-specific review system;
`D` historical or currently unconsumed residue. No current capability had
sufficient evidence for category A.

## Potential general guards

Stale DDL metadata and ordered-DDL checks are mechanically decidable. Their
current inputs, schema, error vocabulary, and downstream review meaning are
Transfer-specific. A future independent, small cross-product guard could be
evaluated separately; it is not justified by this package today.
