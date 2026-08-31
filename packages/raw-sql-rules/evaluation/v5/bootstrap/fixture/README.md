# Bootstrap fixture

This repository has no database-backed regression test yet. Its target is a
disposable MySQL 8.4 at 127.0.0.1:33306; database, user, and password are all
`raw_sql_rules`. mysql2 3.22.3 is available with `namedPlaceholders: true`.
`schema.sql` is the canonical current DDL and `sql/list-work-items.sql` is the
application SQL asset. Do not modify this fixture.
