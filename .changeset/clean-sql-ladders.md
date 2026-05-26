---
"@ashiba/cli": minor
"@ashiba/driver-adapter-core": minor
"@ashiba/driver-adapter-pg": minor
"@ashiba/ddl-pull-pg-dump": minor
"@ashiba/testkit-adapter-pg": minor
---

Add the initial Ashiba CLI and package surface for SQL-first Runtime Zero scaffolding.

The CLI now creates a PostgreSQL-backed starter with visible SQL, editable feature/query boundaries, executable Zero Table Dependency mapper tests, dry-run scaffold flows, migration DDL generation, and isolated customer tutorial verification. It also includes the initial driver adapter contracts, `pg` driver wrapper, `pg` testkit adapter, and `pg_dump` DDL pull helper package.
