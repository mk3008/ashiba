# Failure Prevention Matrix

| Failure case | Current residual path | Smallest alternative | Unique residual value? | Authority after reduction |
| --- | --- | --- | --- | --- |
| missing named input | named binder rejects before native call | named core rejects | no pg-package value | named core |
| unused named input | named binder rejects before native call | named core rejects | no pg-package value | named core |
| hostile value in SQL input | generated SQL plus values stays separate | named core plus native pg | no pg-package value | named core / native driver |
| binding metadata from different SQL | source-hash gate rejects | `model-gen --check`; local transform verification when required | only transform-local value | build-time, plus optional transform |
| unknown/hostile sort key | finite renderer rejects | application reviewed finite map rejects | no | application rule/tests |
| stale safe-sort insertion | runtime metadata check rejects | application update/tests; Rule Only result | not enough for package | application unless a future narrow guard is proved |
| stale optional coordinate range | rejects before rewriting / pg | application tests detect behavior later | yes, optional early proof | productization-pending optional verifier |
| custom pg parser/profile mismatch | profile assertion rejects caller claim | standalone contract compatibility check | no preparation-package value | optional contract boundary |
| wrong business predicate / semantic sort | can still execute | application/integration/live tests | no | application tests |
| transaction or logging policy error | not owned after Phase 2 | application-native pg code | no | application |

## Negative-control basis

Current `postgres-preparation.test.ts` deliberately exercises missing, unused,
stale, and hostile binding cases. Core tests deliberately pass a SQL-like sort
key and an unknown key. The prior
[`dynamic-mechanism-value-ablation.md`](../dynamic-mechanism-value-ablation.md)
compares the safe-sort mechanism with a finite rules-only path and mutates
optional coordinates; it establishes the only distinct residual early failure:
stale optional-coordinate metadata.

No matrix row claims that a structural guard proves business semantics. The
semantic rows require application/live tests.
