---
"@ashiba-ts/cli": patch
"@ashiba-ts/driver-adapter-core": patch
"@ashiba-ts/driver-adapter-pg": patch
---

Fix PostgreSQL optional-condition compression metadata and safe sort insertion so compressed optional filters compose with LIMIT, WINDOW, and grouped optional WHERE predicates without producing malformed SQL.

The PostgreSQL adapter now trusts CLI-generated metadata for optional condition removal and safe sort insertion instead of performing runtime SQL cleanup or clause realignment.
