---
"@ashiba-ts/driver-adapter-core": minor
"@ashiba-ts/cli": minor
---

Clarify Ashiba's runtime boundary as no ORM runtime with selected thin SQL execution adapters, move feature query executor contracts into driver-adapter-core, and add query cardinality helpers for generated query boundaries.

Generated query boundaries now import cardinality helpers directly from driver-adapter-core while keeping the application-owned executor shim as the feature boundary. Scaffolded `insert` uses `queryOne`, `get-by-id` uses `queryOneOrNull`, and `list`/`update`/`delete` use `queryMany` so mutation workflows can interpret zero returned rows themselves.

Existing projects that scaffold new query boundaries should add `@ashiba-ts/driver-adapter-core` as a direct application dependency, because generated query files now import `queryMany`/`queryOne`/`queryOneOrNull` from the core package.
