# MySQL native named-parameter live evidence

- **Database:** disposable `mysql:8.4` Docker container on `127.0.0.1:33306`.
- **Driver:** `mysql2@3.22.3`, `namedPlaceholders: true`.
- **Source syntax:** reviewed MySQL SQL assets with `:name` placeholders and
  object bindings. No ORM, query builder, Ashiba package, or helper package was
  used.
- **Command:** `pnpm --dir packages/raw-sql-rules test:live`.

Observed output from the actual run:

```json
{
  "queryBehavior": { "filteredRows": 1, "unfilteredRows": 1 },
  "constraint": "duplicate email rejected with ER_DUP_ENTRY",
  "runtimeRepresentation": {
    "id": ["number", "Number"],
    "owner_id": ["number", "Number"],
    "priority": ["number", "Number"],
    "amount": ["string", "String"],
    "metadata": ["object", "Object"],
    "created_at": ["object", "Date"]
  }
}
```

This is live database/driver evidence. It does not establish behavior for any
other dialect or application query.
