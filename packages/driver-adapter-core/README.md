# @ashiba-ts/driver-adapter-core

Core contracts and helpers for optional Ashiba SQL preparation and adapter conveniences.

This package is shared infrastructure for Ashiba driver adapters and generated
optional driver conveniences. It is not an ORM runtime and does not provide a SQL DSL.

Start with the repository README for the full SQL-first workflow:

- [Ashiba README](https://github.com/mk3008/ashiba#readme)
- [Command API](https://mk3008.github.io/ashiba/generated/api/commands)

## What This Package Owns

It provides shared types and helpers for:

- masked parameter logging
- logger-ready execution events
- deterministic adapter metadata types
- `many` / `one` / `oneOrNull` cardinality helpers
- dialect-extensible query model binding slots
- safe sort profile rendering
- common query execution contracts used by driver adapters

Existing application projects may use adapter metadata with this
package and a concrete adapter such as `@ashiba-ts/driver-adapter-pg`; native
driver execution remains an equally valid application-owned baseline.
