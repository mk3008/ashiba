# Architecture references

Ashiba has no required application architecture. The same Builder Mapper core
fits a small direct module, vertical slices, and layers:

| Reference | SQL and metadata | Native driver and transaction | Mapping and tests |
| --- | --- | --- | --- |
| Minimal ticket queue (`examples/postgres-ticket-queue-reference`) | Adjacent visible SQL and generated binding module | Application module calls `pg` and owns the transaction | Application module and live tests |
| Vertical-slice ticket queue (`examples/postgres-ticket-queue-vsa`) | Feature-local SQL and generated metadata | Feature application boundary owns `pg` use | Feature-local tests |
| Layered ticket queue (`examples/postgres-ticket-queue-layered`) | Query/infrastructure layer | Application service owns transaction; adapter owns pool | Service tests and integration tests |

In every reference, Ashiba owns only canonical SQL preparation: deterministic
metadata/freshness and named binding. The application owns its directory shape,
pool, transaction, logging, mapping, migrations, and business policy.
