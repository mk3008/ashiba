---
"@ashiba/driver-adapter-core": patch
"@ashiba/driver-adapter-pg": patch
"@ashiba/cli": patch
---

Document and enforce file-backed runtime SQL boundaries and exact safe-sort whitelist matching.

The PostgreSQL adapter now exposes query source objects instead of a bare runtime SQL string as the execution input. CLI scaffolds also generate query source objects for feature and starter executors. Safe-sort tests now verify that sort keys must exactly match the query model whitelist.
