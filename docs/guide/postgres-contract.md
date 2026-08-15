---
title: PostgreSQL-derived query contracts
---

# PostgreSQL-derived query contracts

Ashiba's normal SQL and DDL analysis is offline. It remains useful when no
database is available, but it cannot safely prove every PostgreSQL type. The
optional PostgreSQL contract command adds a stronger development-time layer
without putting a database inspector in application runtime.

```bash
export ASHIBA_POSTGRES_DATABASE_URL=postgresql://localhost/application_test
npx ashiba feature query postgres-contract users-list list
```

The command reads the canonical feature-local `.sql`, compiles named parameters
to ordinary PostgreSQL placeholders, and uses PostgreSQL `PREPARE` plus
`pg_prepared_statements` metadata. The application statement is not executed.
An `INSERT`, `UPDATE`, or `DELETE` can therefore be described without applying
that mutation. Run the command only against a development/test database: parse
and catalog resolution still depend on the real schema and acquire normal
metadata locks.

The output is VSA-local:

```text
src/features/<feature>/queries/<query>/
  <query>.sql
  query.ts
  generated/
    postgres.contract.json
    query.meta.ts
```

`postgres.contract.json` is deterministic for the same SQL, server major,
schema types, and driver profile. Its source hash is embedded in runtime query
metadata. SQL changes make the contract stale; `ashiba check` reports the issue
and the PostgreSQL adapter rejects execution before calling the driver. Refresh
offline metadata as usual, then rerun `feature query postgres-contract` when DB
proof is required.

## Three different facts

The contract intentionally does not collapse these concerns:

1. **Database type**: PostgreSQL OID, schema/name, base/array/enum/domain kind,
   element/base type, enum labels, type modifiers, and domain constraints. This
   is `proven` by PostgreSQL metadata. A recursive OID-free identity is also
   emitted for cross-cluster resource comparison.
2. **Nullability**: offline SQL/DDL evidence is `inferred`; unavailable evidence
   remains `unknown`. Prepared result type metadata does not generally prove
   result nullability.
3. **Driver representation**: the selected node-postgres profile maps database
   values to JavaScript/TypeScript values and is marked `driver-mapped` or
   `unknown`.

For the default node-postgres profile, common result mappings include:

| PostgreSQL type | Default driver value |
|---|---|
| `smallint`, `integer`, floating-point | `number` |
| `bigint`, `numeric` | `string` |
| `boolean` | `boolean` |
| `date`, `timestamp`, `timestamptz` | `Date` |
| registered arrays | JavaScript arrays of the element representation |
| enum | PostgreSQL-proven string-literal union (for example, `"queued" | "done"`) |
| domain | representation of its base type; domain identity remains in the DB contract |
| `json`, `jsonb` | parsed JSON value, TypeScript `unknown` |

JSON parsing does not prove a DTO shape. An interface such as
`{ kind: string }` is rejected unless application-owned validation/decoding
provides that proof outside this database contract.

## Custom node-postgres type parsers

Ashiba does not own `pg` client configuration. If an application installs custom
type parsers, use a stable application-owned profile ID:

```bash
npx ashiba feature query postgres-contract users-list list \
  --driver-profile custom:application-v1
```

```ts
const adapter = createPostgresAdapter(pool, {
  driverProfile: 'custom:application-v1',
});
```

The IDs must match or execution fails before the wrapped client is called.
Ashiba cannot automatically inspect arbitrary parser registries, so forgetting
to declare a custom profile remains an application configuration error. Custom
profiles generate `unknown` driver value types instead of pretending that the
default mappings still apply.

## Result-name and dependency evidence

PostgreSQL prepared-statement metadata proves result types by position but does
not expose result aliases. For SELECT-like statements, Ashiba creates a
transaction-local temporary view with typed `NULL` parameter substitutes, then
reads its catalog metadata. This proves output names and type modifiers and
records referenced columns, relations, views, and functions without executing
the application statement. If PostgreSQL cannot represent the statement as a
temporary view, Ashiba rolls back to a savepoint and retains offline inferred or
unknown evidence with `ASHIBA_POSTGRES_SELECT_DESCRIPTION_DEGRADED`.

The temporary view does not generally prove result nullability. That remains
inferred or unknown. Referenced column `NOT NULL` facts and view-definition
hashes are stored separately so schema compatibility can report the evidence
without overstating result-level proof.

This feature does not apply migrations, configure drivers, construct queries,
or change the canonical SQL ownership model. It is an optional validation and
enrichment step between offline generation and normal thin-adapter runtime.
