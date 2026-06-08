---
"@ashiba-ts/cli": patch
"@ashiba-ts/driver-adapter-core": patch
"@ashiba-ts/driver-adapter-pg": patch
---

Fix PostgreSQL optional-condition compression metadata and safe sort insertion so compressed optional filters compose with LIMIT, WINDOW, grouped optional WHERE predicates, and safe sort prepending without producing malformed SQL.

The CLI now emits leading optional-prefix removal metadata for WHERE groups, allowing the PostgreSQL adapter to remove a null leading run while preserving later optional predicates without runtime SQL parsing or cleanup. The adapter also keeps safe sort insertion aligned after optional compression and PostgreSQL placeholder renumbering.
