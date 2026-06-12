---
"@ashiba-ts/cli": patch
"@ashiba-ts/driver-adapter-pg": patch
"@ashiba-ts/driver-adapter-mysql2": patch
"@ashiba-ts/driver-adapter-mssql": patch
---

Normalize SQL source line endings before query metadata hashing and driver metadata validation so CRLF-only checkout differences do not create false query-model drift.
