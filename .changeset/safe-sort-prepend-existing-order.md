---
"@ashiba-ts/cli": minor
"@ashiba-ts/driver-adapter-core": minor
"@ashiba-ts/driver-adapter-pg": minor
---

Treat existing `ORDER BY` terms as a stable suffix for safe sort by default.

Generated safe sort metadata now records a prepend insertion mode for queries that already have a top-level `ORDER BY`, so a visible SQL order such as `order by id` remains as the deterministic tie-breaker while runtime safe sort keys are rendered before it.
