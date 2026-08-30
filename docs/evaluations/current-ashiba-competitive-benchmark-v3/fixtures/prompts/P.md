# Arm P delta

Use the installed Prisma 8 Release Candidate / current-generation workflow for
the main data-access path. The exact frozen packages are `prisma@8.0.0-rc.12`
and `@prisma/orm-postgres@8.0.0-rc.8`; Prisma 8 is not GA/stable for this
benchmark. Do not replace that path with native `pg`. If a documented Prisma
raw-SQL API is necessary for PostgreSQL-specific work, keep it within Prisma
and explain the reason in the run report.
