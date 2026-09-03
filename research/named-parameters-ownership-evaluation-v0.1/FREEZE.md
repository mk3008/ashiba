# Named Parameters Ownership Evaluation v0.1 — Pre-execution Freeze

- Ashiba starting `main`: `9e756deda1ba4586b9ce91f379e919aea5cb9446`.
- Ashiba remains archived research. This study neither revives it nor changes production package code.
- No `mk3008/raw-sql-rules` repository is modified by this study.

## Evaluated package tree

`packages/named-parameters/` is evaluated as it exists at the starting commit. SHA-256:

- `package.json`: `0d50ebc8645e20bc734f92d58b9d93f836b0d5051d2b1128c71fc047ef2d12c0`
- `README.md`: `7e0a2cee7b638083a49792f5c952946f68cab4b792dcf0871c5fecf92dd1eb3e`
- `src/compiler.ts`: `a128f889070d141efc7973e60f6fc7199386f949a38b1e7929c7f09f6be8563c`
- `src/index.ts`: `02fd92a011d0f4ddf24991595c2e3fa7796d9cae6acd81b7f3d0f4bbc66c0ed7`
- `tests/compiler.test.ts`: `2f0d0909bf815ef6f5dbe6e447f1be118aabfd8aff3add36a40b93097c041b25`
- `tests/named-parameters.test.ts`: `82ca6d4ef31111e912f0a590b188691877fff96acc73caadcbdd3f15c3f790f2`

## Frozen evaluation

Evaluate A–J from the human instruction: responsibility coherence; dependencies/runtime cost; binding styles; lexical safety and fail-closed boundary; credible disposable inline alternative; existing assurance; small real probes (node-postgres, anonymous if cheap, native named optional); API necessity; existence and repository ownership decisions; and driver-agnostic Raw SQL Rules implication.

Existence classifications are exactly `KEEP`, `REDUCE`, `INLINE`, or `REMOVE`. Repository ownership classifications are exactly `KEEP_IN_ASHIBA_RESEARCH`, `REHOME_STANDALONE_CANDIDATE`, `REHOME_RAW_SQL_FAMILY_CANDIDATE`, or `NO_ACTIVE_OWNERSHIP`.

## Planned probe boundaries

1. node-postgres + PostgreSQL: canonical meaningful names compiled to indexed `$n`, repeated name, missing/extra rejection, cast syntax, hostile value remains a bound value.
2. Anonymous real driver/database only if cheap locally; otherwise record `UNTESTED` without substituting a mock.
3. Native named binding is documented/static only unless a cheap real probe exists.

The inline alternative is disposable, for one selected driver stack, and must cover repeated names, missing/extra bindings, lexical false positives relevant to that stack, casts, and positional semantics. No new parser, adapter, package, release, or production package change is permitted.
