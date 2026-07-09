# @ashiba-ts/driver-adapter-core

Core contracts and helpers for thin Ashiba SQL execution adapters.

This package is shared infrastructure for Ashiba driver adapters and generated
feature query boundaries. It is not an ORM runtime and does not provide a SQL DSL.

Start with the repository README for the full SQL-first workflow:

- [Ashiba README](https://github.com/mk3008/ashiba#readme)
- [Command API](https://mk3008.github.io/ashiba/generated/api/commands)

## What This Package Owns

It provides shared types and helpers for:

- masked parameter logging
- logger-ready execution events
- explicit retry policy helpers for visible transient-failure retry boundaries
- feature query boundary types
- `many` / `one` / `oneOrNull` cardinality helpers
- dialect-extensible query model binding slots
- safe sort profile rendering
- common query execution contracts used by driver adapters

Application projects that use generated feature query boundaries should install
this package alongside a concrete adapter such as `@ashiba-ts/driver-adapter-pg`.

`withAshibaRetry` is intentionally policy-driven. It does not decide that SQL,
transactions, external side effects, or SAGA workflows are safe to execute again.
Application code must pass an explicit classifier and own idempotency,
compensation, and logging policy.
