---
"@ashiba-ts/cli": patch
---

Generate DB-valid mapper probe literals for timestamp-like and JSON columns in feature test scaffolds.

Generated mapping cases now keep JSON values as JSON-compatible objects instead of stringifying them to `"[object Object]"`, and TypeScript case rendering no longer rewrites JSON string contents while formatting object keys.
