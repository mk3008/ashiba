# Guides

Short guides for Ashiba concepts that are easier to understand as named patterns than as command reference entries.

## Normative and Advisory References

- [Ashiba Scope](../design/ashiba-scope.md): normative product-boundary source of truth.
- [SQL Guidelines](./sql-guidelines.md): non-normative advice for readable, locally explainable SQL.

## Current Implementation References

The following pages describe existing implementation behavior and terminology.
They do not define the normative product boundary.

- [SSSQL (current implementation)](./sssql.md): historical implementation terminology and optional-condition subtraction behavior.
- [Safe Sort (current implementation)](./safe-sort.md): current generated-metadata dynamic `ORDER BY` implementation.

## Other Guides

- [Runtime Boundary](./runtime-boundary.md): No ORM runtime, thin SQL execution adapters, and generated SQL snapshots.
- [SQL Format](./sql-format.md): scaffolded SQL style and explicit safe formatting for existing SQL files.
- [SQL Resources and Schema Compatibility](./sql-resource-compatibility.md): expose canonical SQL outside TypeScript and compare a PostgreSQL schema change against the full SQL fleet.
