# Surface Dependency Graph

```text
canonical SQL
  └─ named-parameters compiler ── lowered SQL + binding metadata ── binder ── native pg
       └─ standalone PostgreSQL contract (optional)

feature scaffold / init
  ├─ driver-adapter-core query types
  ├─ generated feature layout + DTO/mapper contracts
  ├─ query.meta.ts + query.sql.ts
  ├─ generated mapper checks
  └─ feature tests ── ZTD wrappers/fixtures ── testkit-adapter-pg

driver-adapter-pg
  └─ optional compression / safe-sort metadata

CLI optional tools
  ├─ SQL resource + migration + DDL pull
  ├─ lint/format/query analysis/uses
  ├─ perf/RFBA
  └─ gate scaffold
```

The first chain is the Golden Path. The second is the highest-leverage
reduction group: removing scaffold ownership can remove its generated feature,
mapper and ZTD maintenance chain without removing compiler/binder/native pg.
