# Runtime boundary

The application owns the `pg.Pool`, client acquisition/release, transaction
statements, rollback policy, `FOR UPDATE SKIP LOCKED` claim policy, and JSONB
audit context. The only generic helper scans complete named SQL assets and
returns ordinary `{ sql, values }` for node-postgres.

The lowering helper does not parse or construct query meaning. It recognizes
code-token named parameters, preserving repeated values, PostgreSQL casts,
quoted strings, quoted identifiers, line comments, and block comments.
