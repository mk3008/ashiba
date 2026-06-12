---
"@ashiba-ts/driver-adapter-core": patch
"@ashiba-ts/driver-adapter-pg": patch
---

Add per-execution and caller metadata to SQL observer events so applications can correlate `start`, `end`, and `error` log records for the same SQL execution and tie them back to the API route that caused them.
