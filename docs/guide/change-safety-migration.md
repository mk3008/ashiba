---
title: Change-Safety Migration
---

# Change-Safety Migration

Ashiba no longer provides `ashiba gate scaffold` or the
`@ashiba-ts/ddl-pull-pg-dump` package. This is a deliberate breaking removal:
there is no compatibility command, forwarding package, or replacement
framework.

## Project checks, CI, and hooks

Own package scripts, CI workflows, and Git hooks in the application or
repository that needs them. Call the retained Ashiba checks directly where
they are useful, for example:

```sh
ashiba project check
ashiba model-gen src/queries/list.sql --out src/queries/list.bindings.ts --check
```

Ashiba does not own the lifecycle, update policy, or platform conventions for
those project-local files.

## PostgreSQL DDL pulls

Call native `pg_dump` directly, or own a small project-local script when its
flags, output path, credential handling, and platform behavior need to be
standardized. Ashiba no longer wraps the external executable.

## Database migrations

Ashiba does not author or own migration lifecycle. Use a dedicated migration
library, native database tooling, or application-owned reviewed SQL migrations.
Migration apply, rollback, history, deployment, credentials, CI scheduling,
and live tests remain application-owned.

Ashiba may still read DDL as an optional verification input, for example for
narrow DDL-backed SQL lint. Combining a migration tool with Ashiba through an
application or AI-assisted workflow is normal integration; Ashiba does not
provide a migration command, generic migration interface, or compatibility
wrapper.

`ashiba sql-resource snapshot` and `ashiba sql-resource compare` remain the
separate optional fleet-level SQL resource comparison boundary.
