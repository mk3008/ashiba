# Drift Analysis

| Drift class | Current named | pg direct | mysql2 driver named | mysql2 anonymous | mssql driver named |
| --- | --- | --- | --- | --- | --- |
| Source ↔ generated artifact | `model-gen --check` source hash | binding artifact could disappear only if no remaining metadata requires it | same | same | same |
| SQL ↔ callsite | binder catches name set differences | driver catches cardinality, not order semantics | missing detected; surplus silent | cardinality detected, occurrence meaning silent | missing detected; surplus silent |
| Semantic drift | application/live tests | application/live tests | application/live tests | application/live tests | application/live tests |
| Comment drift | intentionally unowned | review-only | review-only | review-only | review-only |
| Ashiba rendering drift | compiler tests own it | delegated to application | delegated to mysql2 lowering | delegated to application | largely absent because syntax matches |
| Driver internal rendering drift | not Ashiba's responsibility | n/a | mysql2 version/regression risk | n/a | driver/API compatibility risk |
| Duplicate occurrence drift | compiler preserves logical identity | explicit reused index | driver preserves repeat name | caller duplicates values | driver preserves repeat name |
| Metadata-coordinate drift | compiler-derived PostgreSQL coordinates | would require a different coordinate basis or reduction | unchanged only with canonical named source | potentially redesigned | unchanged only with canonical named source |

The important distinction is between an eliminated guard target and a lost guard. If a future driver-native design removes generated binding artifacts, binding freshness can disappear because its target disappeared. It may not be counted as a saving if source hashes, result contracts, coordinate transforms, or a replacement manifest still remain.
