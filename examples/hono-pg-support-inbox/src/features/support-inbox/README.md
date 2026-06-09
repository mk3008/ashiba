# support-inbox

`support-inbox` is the subsystem feature root for this example.

It is not treated as one large feature boundary. Reviewable behavior is split into smaller use-case features:

- `list-tickets`: ticket list and selected ticket detail read model.
- `create-ticket`: header/detail ticket creation workflow.
- `update-ticket-status`: optimistic status update workflow.

The example config sets:

```json
{
  "featureRoot": "src/features/support-inbox",
  "sqlRoots": ["src/features/support-inbox"]
}
```

With that configuration, Ashiba CLI commands treat the directories above as feature boundaries while still keeping them grouped under the support inbox subsystem.

## Query Boundaries

```text
list-tickets/
  queries/list-tickets/
  queries/get-ticket-detail/

create-ticket/
  queries/list-customers-for-ticket/
  queries/create-ticket/
  queries/create-ticket-message/

update-ticket-status/
  queries/update-ticket-status/
```

## Header/detail create scaffold

The Create feature uses multiple mutation query boundaries to create one ticket header and one initial message detail.

```sh
npx ashiba feature query scaffold create-ticket create-ticket --table tickets --action insert
npx ashiba feature query scaffold create-ticket create-ticket-message --table ticket_messages --action insert
```

After SQL edits, refresh each query boundary and update mapper fixtures:

```sh
npx ashiba feature query refresh create-ticket create-ticket
npx ashiba feature query refresh create-ticket create-ticket-message
npx ashiba feature tests check create-ticket --query create-ticket --fix
npx ashiba feature tests check create-ticket --query create-ticket-message --fix
```

## Transaction composition

Feature/query code does not own transaction policy.

The web adapter starts the transaction with `withPgTransaction`, then passes the same `FeatureQueryExecutor` into the Create workflow. The workflow passes that executor to `create-ticket` and `create-ticket-message`, so both SQL boundaries run on the same borrowed PostgreSQL client.

Keep `begin`, `commit`, `rollback`, isolation level, retry policy, and failure reporting at the application or adapter boundary.

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
