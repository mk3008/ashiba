# Architecture reference report

Three current references use the same ticket domain without prescribing an
Ashiba architecture:

| Shape | Reference | Boundary |
| --- | --- | --- |
| Minimal | `examples/postgres-ticket-queue-reference` | Direct application module owns native `pg` and transaction. |
| Vertical slice | `examples/postgres-ticket-queue-vsa` | SQL, metadata, mapping, and native `pg` stay feature-local. |
| Layered | `examples/postgres-ticket-queue-layered` | SQL access and pool adapter are separated from an application service. |

VSA and layered references originated as independent clean-room candidate
outputs from the same frozen DDL/business acceptance and an AGENTS.md sample.
The repository copies use workspace dependencies solely for repository CI;
the clean-room evidence used packed public tarballs. Their provenance files and
exact prompts are committed alongside the references.

Both shapes use optional filters, a finite reviewed sort set, pagination, get,
and assign-plus-audit transaction semantics. Finite sort policy belongs to the
application: no Safe Sort runtime is restored.
