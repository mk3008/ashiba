---
"@ashiba-ts/cli": patch
"@ashiba-ts/driver-adapter-pg": patch
"@ashiba-ts/driver-adapter-mssql": patch
"@ashiba-ts/driver-adapter-mysql2": patch
"@ashiba-ts/named-parameters": minor
---

Add a small named-parameter package with a build-time compiler and a runtime
binder. The CLI now consumes the compiler as a normal package dependency rather
than exposing an implementation-only CLI subpath.
