# Guides

Short guides for Ashiba concepts that are easier to understand as named patterns than as command reference entries.

## Normative and Advisory References

- [Ashiba Scope](../design/ashiba-scope.md): normative product-boundary source of truth.
- [SQL Guidelines](./sql-guidelines.md): non-normative advice for readable, locally explainable SQL.

## Other Guides

- [Runtime Boundary](./runtime-boundary.md): Native-driver baseline execution and the minimal named-SQL bind path.
- [Driver surface migration](./driver-adapter-migration.md): migrate removed driver adapters and runtime query rewrites to application-owned integration.
- [Optional CLI Analysis Migration](./optional-cli-analysis-migration.md): migrate removed formatter and advisory analysis commands while retaining query uses and DDL-backed lint.
- [Change-Safety Migration](./change-safety-migration.md): own removed scaffolding, `pg_dump`, and migration lifecycle in project-local or dedicated tooling.
- [SQL Resources and Schema Compatibility](./sql-resource-compatibility.md): expose canonical SQL outside TypeScript and compare a PostgreSQL schema change against the full SQL fleet.
