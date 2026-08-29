# @ashiba-ts/driver-adapter-core

Core contracts and helpers for optional Ashiba SQL preparation and adapter conveniences.

This package is shared infrastructure for Ashiba driver adapters and generated
optional driver conveniences. It is not an ORM runtime and does not provide a SQL DSL.

Start with the repository README for the full SQL-first workflow:

- [Ashiba README](https://github.com/mk3008/ashiba#readme)
- [Command API](https://mk3008.github.io/ashiba/generated/api/commands)

## What This Package Owns

It provides shared types and helpers for:

- deterministic query-model and contract metadata types
- dialect-extensible query model binding slots
- safe sort profile rendering

Existing application projects may use deterministic preparation with this
package and `@ashiba-ts/driver-adapter-pg`; native driver execution is the
application-owned baseline.
