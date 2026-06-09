# support-inbox

Imported query: list-tickets

Mutation queries:

- create-ticket
- create-ticket-message

Support queries:

- get-ticket-detail
- list-customers-for-ticket

This feature was scaffolded from an existing visible SQL file.
Generated code is editable after import. Keep SQL visible, named, and directly runnable in a SQL client.
Generated mapper cases prove that representative DB result values can map into the generated DTO shape.
Human/AI-owned SQL logic cases belong under the query-local `tests/cases/` directory.
Mutation mapper cases prove `RETURNING` row compatibility. Route/integration tests prove that the application-owned transaction creates the expected ticket and first message.

## Header/detail create scaffold

This feature uses multiple mutation query boundaries to create one ticket header and one initial message detail.

- `create-ticket` inserts the `tickets` header row.
- `create-ticket-message` inserts the first `ticket_messages` detail row.

Both boundaries can be scaffolded into the existing feature:

```sh
npx ashiba feature query scaffold support-inbox create-ticket --table tickets --action insert
npx ashiba feature query scaffold support-inbox create-ticket-message --table ticket_messages --action insert
```

Use `--returning minimal` when the application only needs the primary key from a new row. Keep the broader default when the workflow or review surface benefits from the returned row shape.

After SQL edits, refresh each query boundary and update mapper fixtures:

```sh
npx ashiba feature query refresh support-inbox create-ticket
npx ashiba feature query refresh support-inbox create-ticket-message
npx ashiba feature tests check support-inbox --query create-ticket --fix
npx ashiba feature tests check support-inbox --query create-ticket-message --fix
```

The workflow code owns the business sequence. It passes the same executor to both generated query functions, so the SQL stays visible and generated support stays local to each boundary.

## Transaction composition

This feature does not own transaction policy.

The web adapter starts the transaction with `withPgTransaction`, then passes the same `FeatureQueryExecutor` into the Create workflow. The workflow passes that executor to `create-ticket` and `create-ticket-message`, so both SQL boundaries run on the same borrowed PostgreSQL client.

Keep `begin`, `commit`, `rollback`, isolation level, retry policy, and failure reporting at the application or adapter boundary. Feature/query code should accept an executor and stay unaware of whether it is running inside a transaction.

## Mutation test scope

Use generated mapper cases for DB-to-TypeScript result contracts:

- SELECT result rows
- INSERT/UPDATE/DELETE `RETURNING` rows
- DTO shape, column names, nullability, and representative DB values

Use route or integration tests for TypeScript-to-DB and workflow behavior:

- input validation and parameter construction
- affected rows and persisted database state
- transaction composition and rollback behavior
- database defaults, constraints, triggers, and read-after-write checks

This keeps CUD supported without overstating what mapper tests prove.
