# Architecture references

Ashiba has no required application architecture. Its named-parameter
mechanical core fits a small direct module, vertical slices, and layers:

| Reference | SQL and binding cache | Native driver and transaction | Mapping and tests |
| --- | --- | --- | --- |
| Minimal ticket queue (`examples/postgres-ticket-queue-reference`) | Adjacent visible SQL and application-controlled compilation/cache | Application module calls `pg` and owns the transaction | Application module and live tests |
| Vertical-slice ticket queue (`examples/postgres-ticket-queue-vsa`) | Feature-local SQL and application-controlled compilation/cache | Feature application boundary owns `pg` use | Feature-local tests |
| Layered ticket queue (`examples/postgres-ticket-queue-layered`) | Query/infrastructure layer | Application service owns transaction; adapter owns pool | Service tests and integration tests |

In every reference, Ashiba owns deterministic named compilation and binding.
The application owns its SQL loading and cache, directory shape,
pool, transaction, logging, mapping, migrations, and business policy.
