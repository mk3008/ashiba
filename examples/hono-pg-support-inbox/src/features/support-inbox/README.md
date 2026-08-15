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

## Generated contracts are yours

Ashiba starts conservatively when SQL result types depend on PostgreSQL driver policy, expression output, JSON shape, or aggregate shape.

In this example, generated query metadata can infer more result types than before, including timestamp/date-like SQL types as `string`, PostgreSQL `bigint`/`numeric` values as `string`, safe JS numeric SQL types such as `integer`/`double precision` as `number`, and simple text arrays as `string[]`.

Some generated query contracts can still contain `unknown` fields:

- `jsonb` outputs such as `metadata`
- custom/domain/extension-specific outputs
- complex expression outputs where SQL ownership is clearer than automatic TypeScript ownership
- imported-query filter parameters before the feature input boundary narrows them

That is not a promise that application code must stay untyped. It means the generated boundary is customer-owned code.

When the domain policy is known, narrow the editable contract where the application owns it:

- `input.ts` for adapter/request parsing and validation
- `output.ts` for the feature response shape
- `queries/*/query.ts` when the query boundary should expose a narrower app contract
- route or integration tests for HTTP/API behavior
- PostgreSQL-derived contracts or targeted DB-backed inspection for DB-to-TypeScript result contracts

After editing SQL or query contracts, refresh generated assets and run checks:

```sh
npx ashiba feature query refresh <feature> <query>
npx ashiba feature contract check <feature> --query <query>
npx ashiba check
pnpm test
```

For this demo, useful review questions are:

- Did the input boundary change?
- Did the output contract change?
- Did the SQL shape change?
- Did generated runtime metadata or contract evidence change because of a SQL/contract edit?
- Did route-level tests still prove the customer-visible workflow?

The matching exercise is `examples/hono-pg-support-inbox/exercises/contract-boundary-narrowing/`.

## Header/detail create scaffold

The Create feature uses multiple mutation query boundaries to create one ticket header and one initial message detail.

```sh
npx ashiba feature query scaffold create-ticket create-ticket --table tickets --action insert
npx ashiba feature query scaffold create-ticket create-ticket-message --table ticket_messages --action insert
```

After SQL edits, refresh each query boundary and check its contract:

```sh
npx ashiba feature query refresh create-ticket create-ticket
npx ashiba feature query refresh create-ticket create-ticket-message
npx ashiba feature contract check create-ticket --query create-ticket
npx ashiba feature contract check create-ticket --query create-ticket-message
```

## Transaction composition

Feature/query code does not own transaction policy.

The web adapter starts the transaction with `withPgTransaction`, then passes the same `FeatureQueryExecutor` into the Create workflow. The workflow passes that executor to `create-ticket` and `create-ticket-message`, so both SQL boundaries run on the same borrowed PostgreSQL client.

Keep `begin`, `commit`, `rollback`, isolation level, retry policy, and failure reporting at the application or adapter boundary.

## Mutation test scope

Use static/DDL checks, TypeScript, and PostgreSQL-derived contracts for inferable DB-to-TypeScript obligations:

- SELECT result rows
- INSERT/UPDATE/DELETE `RETURNING` rows
- DTO shape, column names, nullability, and driver representation

Use route or integration tests for TypeScript-to-DB and workflow behavior:

- input validation and parameter construction
- affected rows and persisted database state
- transaction composition and rollback behavior
- database defaults, constraints, triggers, and read-after-write checks

Add a human-owned SQL logic test only when row/value/order semantics need an executable example. This keeps CUD supported without treating synthetic rows as business proof.
