# Dependency Graph

```text
canonical SQL -> model-gen bindings/source hash -> named parameter core
                                              |             |
                                              |             +-> native pg/mysql2/mssql
                                              |
                                              +-> optional adapter wrappers
                                                    |-> observer/masking
                                                    |-> runtime source-hash gate
                                                    |-> PG safe sort / optional compression
                                                    `-> core feature/retry/cardinality types

standalone PostgreSQL contract -> core contract types
Ticket Queue -> named core -> native pg
Support Inbox -> core + pg adapter -> named core + native pg
```

The arrow from adapters to drivers is optional. DBMS support is represented by the native-driver path, not by a requirement that applications import an adapter. The only current product/dogfood application package using an adapter is Support Inbox, and it uses PG only.
