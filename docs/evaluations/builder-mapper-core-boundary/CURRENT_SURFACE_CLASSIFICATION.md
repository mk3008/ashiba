# Current Surface Classification

## Builder Mapper core definition

Ashiba's Builder Mapper core is the smallest path that lets an application
keep canonical raw SQL reviewable, derive deterministic named-parameter
binding metadata, validate a named value set, and call its selected native
driver. Result mapping, connection lifecycle, transaction, logging, and
business policy remain application-owned.

```text
canonical .sql -> deterministic binding metadata/freshness
               -> bindNamedParameters -> application-owned native driver
```

Finite dynamic composition is a core *usage boundary*: an application may
select only reviewed, source-controlled SQL fragments from a closed set. It is
not a reason to recreate a generic Ashiba runtime package.

## Classification

| Classification | Capabilities | Owner rationale |
| --- | --- | --- |
| CORE | Canonical `.sql`; named parameter compiler/binder/error/type; binding metadata and `model-gen --check`; native-driver handoff boundary | Without these, the Builder Mapper path loses its deterministic named-binding safety. |
| CORE pattern, application-owned | Finite reviewed dynamic composition; application mapping | Needed to use the core naturally, but business sort/predicate terms must be application policy rather than a generic runtime abstraction. |
| OPTIONAL PROOF | Query uses; narrow DDL-backed lint; standalone PostgreSQL contract; SQL-resource snapshot/compare | Deterministic opt-in inspection or contract proof, not normal execution. SQL-resource has strong live evidence but no current application/CI consumer, so it is not core. |
| REMOVE-FROM-ASHIBA target | DDL migration generation and applyPlan | Migration lifecycle is not required for Builder Mapper; parallel plan metadata has a consistency concern. |
| EXTERNAL / APPLICATION-OWNED | Connection/pool; transactions/rollback; logging/masking; cardinality/result mapping; migration application/lifecycle; schema pull/native `pg_dump`; deployment/CI; business sort policy | Native drivers, dedicated tools, and application policy own these responsibilities naturally. |
| DETACHED EXPERIMENTAL | Transfer and `ddl-docs-cli` | Existing ownership decision; not evidence for the current Ashiba core. |

The classification leaves PostgreSQL PRIMARY, MySQL/mysql2 and SQL
Server/mssql SUPPORTED-SECONDARY unchanged.
