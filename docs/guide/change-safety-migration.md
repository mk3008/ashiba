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

The retained optional review capabilities are unchanged:

- `ashiba ddl migration generate` produces reviewable DDL-diff SQL and risk
  information without applying a migration.
- `ashiba sql-resource snapshot` and `ashiba sql-resource compare` retain the
  optional fleet-level SQL resource comparison boundary.

Application migration application, deployment, credentials, CI scheduling,
and live tests remain application-owned.
