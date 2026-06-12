---
"@ashiba-ts/cli": patch
---

Improve generated starter guidance for mutation query testing and SQL observability.

`ashiba init` now forwards safe query-model metadata such as source hash, statement kind, optional-condition compression status, and safe-sort insertion status through the generated PostgreSQL SQL client metadata. The generated transaction helper now also documents that transaction policy is application-owned and that multiple query boundaries should share the same `FeatureQueryExecutor` inside the transaction callback.

Generated feature READMEs and test plans now clarify that mapper tests prove DB-to-TypeScript result contracts, while TypeScript-to-DB mutation effects, persisted state, transactions, defaults, constraints, and read-after-write behavior belong in route or integration tests.
