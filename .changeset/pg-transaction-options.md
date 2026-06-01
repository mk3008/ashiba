---
"@ashiba-ts/cli": patch
---

Add common PostgreSQL transaction options to the generated pg starter. `withPgTransaction` now supports isolation level, read/write access mode, and deferrable flags while keeping rare transaction policy in customer-owned starter code.
