---
"@ashiba-ts/cli": patch
"@ashiba-ts/driver-adapter-pg": patch
---

Harden SSSQL optional-condition metadata and PostgreSQL runtime cleanup around SQL comments, dollar-quoted text, dangling `WHERE`, and safe-sort insertion after compression.

Feature import anchor inference now keeps outer CTE scope visible while resolving multi-hop CTE sources, so imported SQL can still attach review metadata to the underlying DDL table when the final relation is a CTE.
