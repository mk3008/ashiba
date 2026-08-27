# Reduction Plan

No reduction is implemented by this audit. Batches are ordered to preserve the
Golden Path and avoid pretending unknown public adoption is zero.

| Batch | Exact surfaces | Semver / migration | Golden Path risk / rollback | Estimated maintenance reduction |
| --- | --- | --- | --- | --- |
| 0 | Current source / published CLI / public docs compatibility audit; remove unreachable/deprecated aliases only after source+published package verification | patch/minor for docs; alias removal may require major | none; revert docs/alias change | small, prevents false discovery paths |
| 1 | Freeze MySQL/MSSQL adapters and stop promoting them as primary; inventory public consumers and dependency/security obligations | no API removal; compatibility-only release note | none; unfreeze if adoption or DB evidence arrives | low feature-growth cost, retained security/compatibility cost |
| 2 | Deprecate `init`, feature scaffold/import/query, generated DTO/mapper contracts, mapper checks/tests and generated feature-layout docs | major release; external consumer compatibility census is a gate before deprecation/removal; generated consumer repos retain code but lose regeneration; provide native SQL/binder migration guide | Golden Path independent; rollback by retaining frozen package/command release | high: removes the largest coupled CLI/test/docs/config/layout chain |
| 3 | Remove/deprecate `testkit-adapter-pg`, ZTD generation and ZTD-specific docs/config after Batch 2 census | major; external ZTD/testkit consumer census is a gate before deprecation/removal; application real-schema tests replace generated wrappers | Golden Path independent; freeze during migration if users exist | high: removes fixture grammar, adapter, wrapper, live-matrix and scaffold maintenance |
| 4 | Re-evaluate formatter, lint, analysis/uses, perf, RFBA, SSSQL/safe-sort/compression individually using repeated-use and failure-prevention evidence | command-specific minor deprecation then major removal where justified | optional only; retain a command when unique fail-closed value survives | variable; do not optimize deletion count |

### Ablation priority

The planned throwaway ablation groups are A (scaffold/DTO/mapper) and B
(ZTD/testkit), because the dependency graph shows their direct chain and the
Golden Path has already run without them. C and D are intentionally not grouped
for deletion: optional runtime and productivity surfaces have separate value
claims and must be ablated one by one.

### Compatibility rule

Published package adoption and generated consumer repositories are unknown.
No batch may delete a public package or command without a compatibility census,
a semver decision, migration notes, and a reversible frozen-compatibility option.
