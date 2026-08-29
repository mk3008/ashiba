# Capability Ownership Ledger

| Capability | Decision | Exact durable reason / removal reason | Future implementation boundary |
| --- | --- | --- | --- |
| `query format` | REMOVE | Guarded write is real, but formatting has no Golden Path, freshness, or current workflow dependency | Remove command/config/guide/catalog promotion only; retain independently used formatter internals |
| DDL-backed portion of `lint` | REDUCE / KEEP narrow guard | Reproducible early detection of selected DDL-to-SQL stale references/literal mismatches | Separate retained DDL checks from advisory query lint without broadening rules |
| `query lint` advisory rules | REMOVE | Review convenience, standalone warnings do not fail closed, no current workflow consumer | Remove rule/report surface; do not replace it with a generic policy framework |
| `query uses table/column` | KEEP | AST-backed, repository-wide report with confidence/fallback evidence and strict parse failure by default | Keep optional and on-demand; add direct regression proof in the implementation follow-up |
| `query outline` | REMOVE | Single-query explanatory representation only | Remove public command/rendering when no longer shared by uses |
| `query graph` | REMOVE | Same explanatory structure rendered differently; no mechanical authority | Remove public command/DOT/graph rendering when no longer shared |
| `query slice` | REMOVE | Debug transform requires external execution/test to become meaningful | Remove command and transformation helpers; no replacement framework |

## Overall decision: REDUCE

The current family should be reduced to two distinct optional mechanical
surfaces: AST-first usage inspection and narrow DDL-backed static lint. The
decision does not authorize changes to named parameter binding, model
generation, PostgreSQL contract, SQL resource, migrations, or the Golden Path.
