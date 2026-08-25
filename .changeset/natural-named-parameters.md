---
"@ashiba-ts/cli": patch
"@ashiba-ts/named-parameters": minor
---

Add a small named-parameter package with a build-time compiler and a runtime
binder. The CLI now consumes the compiler as a normal package dependency rather
than exposing an implementation-only CLI subpath.
