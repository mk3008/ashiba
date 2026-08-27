# Product Surface Inventory

This is a classification for the evaluated PostgreSQL Golden Path, not a
deletion proposal.

| Classification | Surface |
| --- | --- |
| core / Golden-Path-required | canonical SQL; `@ashiba-ts/named-parameters`; deterministic lowering/binding metadata; native `pg`; generated freshness check; optional PostgreSQL contract |
| optional but independently valuable | CLI; PostgreSQL driver adapter; lint/formatter; safe sort; optional compression; DDL pull; migration SQL generation; query outline/graph/slice; perf tooling; RFBA |
| compatibility-only | MySQL and SQL Server adapters |
| legacy candidate | scaffold-first feature abstraction, generated DTO/mapper propagation, mandatory-looking ZTD starter narrative |
| removal candidate | none established by this evaluation |
| needs separate evidence | testkit/ZTD, SSSQL, safe sort, migration helpers, performance tooling, query analysis, RFBA, scaffolding and feature abstraction |

The adapter is optional: the native driver remains the baseline execution owner.
