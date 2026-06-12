# Support Inbox Exercises

This directory contains patch-backed exercises for the Support Inbox demo.

Each exercise keeps the starter demo unchanged and stores a verified solution as a patch. This lets the repository preserve realistic improvement tasks while still proving that each task is implementable after library upgrades.

Grid-header sorting with Shift-click multi-sort is part of the starter demo now, so it is covered by the review exercise rather than kept as a patch-backed edit exercise.

## Exercises

- `sql-inspection-review/` - Review the live SQL console and explain why dynamic filters and dynamic safe sort do not hide the SQL.
- `contract-boundary-narrowing/` - Narrow conservative generated request contracts from `unknown` to application-owned types and verify the edit loop.
- `optional-priority-filter/` - Add a `priority` optional filter and follow the CLI/typecheck/test trail.
- `add-customer-locale-column/` - Add a list result column from SQL and follow metadata, DTO, mapper, and UI changes.
- `ddl-migration-script-from-git/` - Add a DDL column and generate reviewable migration SQL from the committed Git snapshot.
