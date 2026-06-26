# @ashiba-ts/transfer-dogfood

`@ashiba-ts/transfer-dogfood` contains transfer-definition features for Ashiba dogfooding workflows.

The initial features register transfer destination definitions and transfer settings for PostgreSQL transfer workflows.

Transfer package tables live under the `rawsql_transfer` schema to avoid collisions with user tables or generic schemas such as `transfer`.

## Migration Source

This package was migrated from the former rawsql-ts transfer dogfood package:

- Source: https://github.com/mk3008/rawsql-ts/tree/main/packages/transfer
- Local source commit used for the initial migration: `4698a87e9a73f8d6b87b0545cb0a740246f7d457`

The package now lives under Ashiba as a dogfooding product. It should use Ashiba public package boundaries instead of importing Ashiba repository internals.

## Ashiba Runtime Boundary

Transfer keeps SQL as the canonical source and uses generated runtime SQL snapshots plus metadata for execution.

- `.sql` files are the reviewed source.
- `generated/query.sql.ts` and `generated/query.meta.ts` are runtime snapshots and metadata generated from the SQL.
- Feature code receives `FeatureQueryExecutor`.
- PostgreSQL wiring stays in `src/adapters/pg`.
- No ORM runtime, entity model, lazy loading, or hidden SQL DSL is introduced.

## Transfer Destination Definition

The `rawsql_transfer.destination_definition` table stores:

- the destination table name
- destination column metadata
- destination key metadata
- optional sequence-expression metadata
- transfer model
- optional red-transfer column metadata

DDL lives in `db/ddl/schema.sql` and `db/ddl/destination_definition.sql`.

## Transfer Model

### transfer_model

| Value       | Meaning                                                                                                             |
| ----------- | ------------------------------------------------------------------------------------------------------------------- |
| `immutable` | Add a red-transfer row for the old black row, then add a new black row on update. Add a red-transfer row on delete. |
| `mutable`   | Directly update an existing transferred row on update. Physically delete the row on delete.                         |

## Transfer Setting

The `rawsql_transfer.setting` table stores the source SQL text, a deterministic source SQL hash, and analysis placeholders.
Source SQL parsing is intentionally out of scope for the create feature; new rows save `source_sql_analysis_status` as `not_analyzed`.

## Feature Boundary

`src/features/create-transfer-destination-definition/` owns the create destination definition use case.
`src/features/create-transfer-setting/` owns the create transfer setting use case.

The destination feature accepts `CreateTransferDestinationDefinitionInput` with `transferModel`.
The setting feature accepts `CreateTransferSettingInput`, resolves destination definitions by name, and creates the setting plus one or more destination links transactionally.
Destination-link input owns transfer-setting-specific mapping and diff-comparison metadata.

Feature-specific validation stays inside this feature. Do not move this validation into `src/libraries/` unless it becomes independent enough to extract as a reusable external package.
