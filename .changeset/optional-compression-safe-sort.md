---
"@ashiba-ts/cli": patch
"@ashiba-ts/driver-adapter-pg": patch
---

Fix PostgreSQL optional-condition compression metadata and safe sort insertion so compressed optional filters compose with LIMIT-bound queries without producing malformed SQL.
