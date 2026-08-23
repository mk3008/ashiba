# N4 external/native mechanism check

For Node/PostgreSQL, node-postgres documents `client.query(text, values)` with
positional PostgreSQL placeholders and an array of values. Its `name` field
names a prepared statement; it does not supply source-level named-value binding.
Therefore it can execute a development-time PostgreSQL artifact directly, but
does not remove the need for an application/tooling mapping from readable named
SQL to positional values.

`psql` accepts colon variables and supports `\bind_named` for parameter
placeholders, which is useful for direct investigation of canonical SQL. Its
colon interpolation must be quoted for literal/identifier safety and is a CLI
facility rather than a Node runtime binding API. Canonical named SQL is therefore
human-investigable but no psql facility is treated as an application executor.

Sources: [node-postgres client API](https://github.com/brianc/node-postgres/blob/master/docs/pages/apis/client.mdx), [PostgreSQL psql documentation](https://www.postgresql.org/docs/current/app-psql.html).
