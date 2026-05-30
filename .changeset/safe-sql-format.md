---
"@ashiba-ts/cli": minor
"@ashiba-ts/driver-adapter-pg": patch
---

Add safe SQL formatting support. Newly scaffolded SQL is formatted with configurable defaults, `ashiba query format` formats existing SQL only after safety checks, and SSSQL optional rewrites avoid whole-file reformatting unless rawsql-ts reports a targeted safe rewrite.

Fix PostgreSQL optional-condition compression when every WHERE predicate is an SSSQL branch so the adapter removes the whole WHERE clause instead of producing dangling SQL or rejecting overlapping branch ranges.
