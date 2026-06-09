# Acceptance: Generate DDL Migration Script From Git

## Functional Acceptance

- The exercise adds `customers.timezone` to `db/ddl/public.sql`.
- The migration command compares `HEAD:examples/hono-pg-support-inbox/db/ddl` with the edited working-tree DDL directory.
- The generated migration SQL contains `ADD COLUMN "timezone" text NOT NULL DEFAULT 'Asia/Tokyo'`.
- The exercise frames migration generation as review support, not production application.

## Implementation Acceptance

- The solution patch changes only the DDL file.
- The verification script applies the solution patch in a disposable worktree.
- The verification script builds the local CLI before running `ddl migration generate`.
- The verification script writes the migration SQL to a temporary ignored location.
- The verification script asserts the generated SQL and command output.

## Verification Command

The reference patch is verified with:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File examples/hono-pg-support-inbox/exercises/ddl-migration-script-from-git/verify.ps1
```
