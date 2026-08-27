# PostgreSQL / pg

Classification: **natural-fit**.

Live PostgreSQL 18.1 / `pg` 8.21.0 execution used the normal native path: generated `$n` SQL and the binder's ordered values were sent directly to `client.query(sql, values)`. The application-owned client performed `BEGIN` and `ROLLBACK`; rollback left zero test rows.

Repeated `:status` compiled to one logical `$2` binding. PostgreSQL needed `:status::text` in the optional filter because an untyped null test otherwise failed with `42P08`; that is a PostgreSQL SQL type-resolution requirement. Missing/unused inputs and stale metadata were rejected before execution, and a hostile string remained a driver value rather than SQL text.

Driver observations were bigint `string`, numeric `string`, timestamp `Date`, boolean `boolean`, nullable column `null`, update `rowCount`, and generated id from an explicit `RETURNING` row as `string`. The existing PostgreSQL-derived contract command remains a PostgreSQL-specific higher-level surface; this evaluation neither changes nor generalizes it.
