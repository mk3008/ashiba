# sqlc generation record

The ticket slice uses the standard sqlc TypeScript `pg` query-module treatment.
Its canonical queries are `tickets.sql`; the generated module is
`generated/tickets.sql.ts`, which is imported by the feature-local use cases.

Run this from the candidate root after making a query change:

```text
sqlc generate
```

The packet schema is runner-owned and is deliberately not copied into this
candidate as application DDL.
