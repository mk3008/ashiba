# T2-P-r2 implementation note

The main data-access path uses Prisma 8 RC (`@prisma/orm-postgres` 8.0.0-rc.8)
with the emitted Prisma contract and its Postgres runtime. The T2 claim requires
PostgreSQL's `FOR UPDATE SKIP LOCKED`, which is outside Prisma 8's current ORM
surface, so the single statement is built and executed through Prisma's documented
`db.raw.sql` lane. No native `pg` client is imported or used by application code.
