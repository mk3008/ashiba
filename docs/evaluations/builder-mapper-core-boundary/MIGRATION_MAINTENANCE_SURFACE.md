# Migration Maintenance Surface

Keeping migration generation as an Ashiba capability requires more than
emitting ordinary SQL text. A durable implementation must maintain a coherent
operation model across all of the following:

| Surface | Permanent responsibility |
| --- | --- |
| DDL interpretation | Tables, columns, indexes, constraints, foreign keys, generated columns, enums/domains, and dialect grammar. |
| Change semantics | ALTER variants, rename ambiguity, type conversion, data backfill, dependency ordering, and destructive changes. |
| DBMS support | PostgreSQL, MySQL, and SQL Server divergent DDL and operational behavior. |
| Review evidence | Generated SQL, summary, risk classification, and any operation plan must agree. |
| Compatibility | Public output schema/types and rawsql-ts compatibility. |
| Verification | Per-dialect fixture and negative-control matrix, including unsafe/ambiguous changes. |

The current additive-column control demonstrates that the review-evidence row
is already non-trivial: generated SQL, `applyPlan`, and risk output are
separate models. Because none is a Builder Mapper prerequisite, moving
migration authoring/lifecycle to dedicated or application-owned tooling avoids
this permanent product obligation without weakening named binding or DDL-backed
verification.
