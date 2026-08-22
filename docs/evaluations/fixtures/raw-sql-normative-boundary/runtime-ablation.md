# R1/R2 runtime ablation

| Question | R1 — current Ashiba adapter compiler | R2 — application-owned lowerer | Observation / limit |
| --- | --- | --- | --- |
| Final PostgreSQL correctness | Metadata-backed compiled query passed W4. | Same canonical query and values passed W4. | Registered edge case only. |
| Named binding | Source hash plus precompiled binding metadata; rejects missing/unused values in adapter code. | Small lexical scan; only the registered tokens are proven. | R2 is not a replacement for all validation. |
| Unsafe construction | No input becomes a syntax fragment at this boundary. | No input becomes a syntax fragment at this boundary. | Whole-application construction is not proven. |
| Runtime dependencies | `@ashiba-ts/driver-adapter-pg`, core contract, and `pg`. | `pg` plus application-owned lowering. | Dependency count is not a value judgement. |
| Owned responsibilities | Binding, stale metadata checks, optional compression, Safe Sort, events, classifier. | Binding only. | R2 does not absorb the other R1 responsibilities. |
| Change / investigation surface | Canonical SQL plus generated metadata and adapter diagnostics. | Canonical SQL plus owned lowerer tests. | Neither surface is universally smaller. |
| Pool / transaction visibility | Executes through the caller-provided client; no automatic transaction ownership. | Same. | The live control observes uncommitted data only on the supplied transaction client. |

`runtime-ablation.mjs` covers casts, string literals, comments, and repeated parameters. `pool-transaction-control.mjs` covers explicit pool/client transaction visibility. Both are reference controls, not candidate agent work.
