---
"@ashiba-ts/driver-adapter-core": minor
"@ashiba-ts/driver-adapter-pg": minor
---

Add a visible retry boundary helper and PostgreSQL transient-error classification for caller-owned retry policies. The helper requires an explicit retry classifier and keeps transaction safety, idempotency, SAGA compensation, and final error handling in application code.
