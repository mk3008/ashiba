---
"@ashiba-ts/driver-adapter-core": patch
"@ashiba-ts/driver-adapter-pg": patch
---

Add a per-execution `executionId` to SQL observer events so applications can correlate `start`, `end`, and `error` log records for the same SQL execution.
