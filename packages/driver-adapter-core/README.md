# @ashiba-ts/driver-adapter-core

Core contracts for thin Ashiba driver adapters.

This package is shared infrastructure for Ashiba driver adapters. It is not an
ORM and is not usually installed directly by application code.

Start with the repository README for the full SQL-first workflow:

- [Ashiba README](https://github.com/mk3008/ashiba#readme)
- [Command API](https://mk3008.github.io/ashiba/generated/api/commands)

## What This Package Owns

It provides shared types and helpers for:

- masked parameter logging
- logger-ready execution events
- safe sort profile rendering
- common query execution contracts used by driver adapters

Application projects normally install a concrete adapter such as
`@ashiba-ts/driver-adapter-pg` rather than this package directly.
