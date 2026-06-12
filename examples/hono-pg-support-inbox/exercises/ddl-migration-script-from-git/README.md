# Exercise: Generate DDL Migration Script From Git

## Goal

Generate a reviewable migration SQL file from a DDL change tracked in Git.

This exercise shows the migration-review path:

1. Edit the application-owned DDL file.
2. Compare the old committed DDL snapshot with the new working-tree DDL.
3. Generate a migration SQL artifact for review.
4. Review the generated SQL and risk report before any database is mutated.

## Why This Exercise Exists

Database deployment is not the same as application deployment.

Copying new application files is usually recoverable. Database migrations can lock tables, fail halfway, or be hard to roll back depending on the DBMS and the operation. Ashiba should therefore not teach that CI/CD blindly applies production migrations.

The useful Ashiba value is earlier in the workflow:

- DDL is visible and Git-managed.
- Git can provide the old DDL snapshot.
- Ashiba can compare old and new DDL and emit reviewable migration SQL.
- CI can generate or verify that migration artifact without connecting to production.

Applying the migration remains an operations decision owned by the customer.

## Task

Add a customer timezone column to the demo DDL:

```sql
timezone text not null default 'Asia/Tokyo',
```

Then generate a migration SQL file by comparing the committed DDL with the edited working-tree DDL.

## Suggested Work Order

1. Add `timezone text not null default 'Asia/Tokyo'` to `examples/hono-pg-support-inbox/db/ddl/public.sql`.
2. Generate migration SQL:

   ```powershell
   node packages/cli/dist/index.js ddl migration generate `
     --from-git HEAD:examples/hono-pg-support-inbox/db/ddl `
     --to-dir examples/hono-pg-support-inbox/db/ddl `
     --out examples/hono-pg-support-inbox/tmp/ddl/customer-timezone-migration.sql
   ```

3. Review the generated SQL.
4. Review the risk summary printed by the command.
5. Do not apply the SQL to a production database as part of this exercise.

Expected generated SQL shape:

```sql
ALTER TABLE "public"."customers" ADD COLUMN "timezone" text NOT NULL DEFAULT 'Asia/Tokyo';
```

## CI/CD Position

This exercise is suitable for CI as a review gate:

- generate or check a migration artifact
- fail when a DDL change lacks a reviewed migration artifact
- report destructive or operational risks

This exercise is not a recommendation to automatically apply migrations to production during a generic application deploy pipeline.

For production, decide separately:

- migration window
- lock and timeout policy
- backup and restore posture
- rollback strategy
- expand/contract rollout plan
- DB-specific transaction behavior
- approval requirements

## Solution Patch

The reference solution is stored in:

```text
exercises/ddl-migration-script-from-git/solution.patch
```

Apply it from the repository root in a disposable worktree:

```powershell
git apply examples/hono-pg-support-inbox/exercises/ddl-migration-script-from-git/solution.patch
```

## Verification

Run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File examples/hono-pg-support-inbox/exercises/ddl-migration-script-from-git/verify.ps1
```
