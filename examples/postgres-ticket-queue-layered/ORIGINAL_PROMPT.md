# Historical concise prompt

This is immutable provenance from the earlier clean-room trial. The current
reference now uses direct application-controlled compilation/cache; do not use
this historical wording as current Ashiba guidance.

Build a layered PostgreSQL ticket application using Ashiba according to
`AGENTS.md`. The DDL is complete. Keep SQL visible, use named parameters and
generated binding metadata, call native `pg`, support list filters, finite
reviewed sorting, pagination, get, and assign-plus-audit rollback. Do not add an
ORM, migration framework, repository generator, or Ashiba runtime abstraction.
