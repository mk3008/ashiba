# Arm P delta

Use the installed Prisma 7.10.0 stable workflow for the main data-access path.
Do not replace that path with native `pg`. If a documented Prisma raw-SQL API
is necessary for PostgreSQL-specific work, keep it within Prisma and explain
the reason in the run report.

