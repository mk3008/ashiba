# Historical concise consumer prompt

This is immutable provenance from the earlier clean-room trial. The current
reference now uses direct application-controlled compilation/cache; do not use
this historical wording as current Ashiba guidance.

Build a TypeScript PostgreSQL ticket application using Vertical Slice
Architecture.

Use Ashiba according to `AGENTS.md` and the existing DDL/business acceptance.
Keep SQL and generated binding metadata inside the ticket slice. Use native
`pg`.

Do not add an ORM, migration framework, generic query builder, or Ashiba
runtime abstraction.
