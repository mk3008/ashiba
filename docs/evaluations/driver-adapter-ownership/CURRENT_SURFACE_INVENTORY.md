# Current Adapter Surface Inventory

Starting point: `d54854b34ea435af7c46ef4bb0cdf3b902954977`.

| Package | Public shape | Source LOC | Test LOC | Direct current consumer |
| --- | --- | ---: | ---: | --- |
| `driver-adapter-core` | metadata/events, retries, sort types, query model/contract types, feature executor/cardinality helpers, contract parsing | 790 | 441 | Support Inbox, CLI contract/resource commands, all adapters |
| `driver-adapter-pg` | `createPostgresAdapter`, compile/prepare helpers, observer, metadata gates, sort/compression, retry classifier | 1,006 | 2,852 | Support Inbox; postgres-live verification |
| `driver-adapter-mysql2` | `createMysql2Adapter`, binding/freshness gate, observer | 205 | 97 | no product consumer outside package tests/docs |
| `driver-adapter-mssql` | `createMssqlAdapter`, binding/freshness gate, observer | 207 | 126 | no product consumer outside package tests/docs |

All four are public packages with package README, changelog, type/build/test scripts and selected-driver/version coupling. `pg` has a live test lane. The root default verify tests each package; that is maintenance evidence, not independent value.

## Consumers and dependency direction

```text
Support Inbox (current dogfood/example) -> core + pg adapter -> named core + pg
mysql2 adapter tests/docs -> core + named core + mysql2
mssql adapter tests/docs -> core + named core + mssql
CLI standalone PostgreSQL contract -> core contract types (not pg adapter)
Ticket Queue reference -> named core + native pg (no adapter)
```

Transfer is detached experimental tooling and is excluded. Historical evaluations are not consumers. No repository product consumer imports the MySQL or SQL Server adapter.
