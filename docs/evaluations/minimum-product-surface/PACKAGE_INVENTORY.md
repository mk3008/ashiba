# Package Inventory

| Package | Golden Path / runtime relation | Current usage and maintenance surface | Classification and removal path |
| --- | --- | --- | --- |
| `@ashiba-ts/named-parameters` | required runtime core | Public compiler and binder; CLI and direct reference use it; parser edge cases, parameter-order compatibility and driver-neutral representation are owned. | **keep-core**. Keep compiler + binder; audit legacy aliases/options separately. |
| `@ashiba-ts/cli` | dev-only; contains core generation/freshness/contract | Public command compatibility, `pg`, `rawsql-ts`, PostgreSQL metadata, generated artifacts, help/descriptor and CI promises. | **keep-core**, but commands are independently classified. |
| `@ashiba-ts/driver-adapter-core` | not required | Feature query/cardinality types, generated boundaries and adapter coupling; consumed by scaffolded examples/dogfood. | **deprecate-remove** after generated-feature compatibility period. Native `pg` plus small application types replace it. |
| `@ashiba-ts/driver-adapter-pg` | optional convenience | Safe sort, optional compression, stale metadata, observer/retry helpers; PostgreSQL/`pg` version coupling. | **keep-optional**; no new Golden Path dependency. |
| `@ashiba-ts/driver-adapter-mysql2` | not required; compatibility | Public wrapper with mysql2/version coupling; no complete init/testkit path. | **compatibility-only / frozen** pending a consumer census. |
| `@ashiba-ts/driver-adapter-mssql` | not required; compatibility | Public wrapper with mssql/version coupling; no complete init/testkit path. | **compatibility-only / frozen** pending a consumer census. |
| `@ashiba-ts/testkit-adapter-pg` | not required | ZTD dependency and generated fixture/harness conventions, PostgreSQL behavior and test maintenance. | **deprecate-remove** with scaffold/ZTD batch; real-schema/application tests replace it. |
| `@ashiba-ts/ddl-pull-pg-dump` | optional dev helper | `pg_dump` executable/version/permissions and DDL comparison behavior. | **keep-optional**: deterministic comparison beyond manually running pg_dump; no Golden Path dependency. |
| `@ashiba-ts/ddl-docs-cli` | repository internal only | Private dogfood docs/concept rendering and generated site artifacts. | **needs-one-more-evidence**: exclude from product distribution; decide separately with dogfood owners. |

All packages are public except private `ddl-docs-cli`; published-package adoption is unknown and must not be inferred from repository references.
