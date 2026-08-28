---
title: PostgreSQL-derived query contracts
---

# PostgreSQL-derived query contracts

`postgres-contract` is an optional development-time proof for direct canonical
SQL. It lowers named parameters, asks PostgreSQL to describe the statement,
and does not execute `INSERT`, `UPDATE`, or `DELETE` mutations.

```bash
npx ashiba postgres-contract write src/tickets/list.sql \
  --database-url "$ASHIBA_POSTGRES_DATABASE_URL" \
  --out src/tickets/list.postgres.contract.json

npx ashiba postgres-contract check src/tickets/list.sql \
  --contract src/tickets/list.postgres.contract.json \
  --result-type-file src/tickets/types.ts --result-type Ticket \
  --params-type-file src/tickets/types.ts --params-type ListTicketParams
```

Use a development/test database. The command records source identity and
parameter/result type evidence. A stale SQL source, missing/extra field, or
manual TypeScript type that disagrees with the observed default `pg`
representation fails closed. For example, PostgreSQL `bigint` and `numeric`
are `string` with node-postgres defaults, not `number`.

Database type, nullability evidence, and driver representation remain separate.
Prepared result metadata does not generally prove full nullability. Custom
driver parsers remain application-owned and must not be hidden by this tool.

The contract neither creates a feature scaffold nor a mapper, runtime adapter,
pool, transaction, or application ordering policy. See the
[runtime boundary](./runtime-boundary.md).
