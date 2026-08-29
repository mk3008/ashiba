# Current Consumer Census

The census distinguishes an executable consumer from a command merely being
registered, documented, or tested.

| Capability | Golden Path / standard verify | Current product/example/dogfood invocation | CI-only invocation | Test-only | Historical/docs-only | Result |
| --- | --- | --- | --- | --- | --- |
| `query format` | None | None found | None | None direct | `docs/guide/sql-format.md`; historical dogfooding | No executable current consumer |
| `lint` | None | None found | None | None direct | Command catalog and historical material | No executable current consumer |
| `query lint` | None | Only internal call from `lint` | None | None direct | Command catalog | No independent consumer |
| `query uses` | None | No script invokes it; current Support Inbox query catalogs are compatible source input | None | None direct | Command catalog | On-demand current-corpus capability, not a workflow dependency |
| `query outline` / `graph` | None | None found | None | None direct | Command catalog | No executable current consumer |
| `query slice` | None | None found | None | None direct | Command catalog | No executable current consumer |

Detached Transfer is not counted as Ashiba product retention evidence. No
explicit Transfer invocation of this command family was found in the current
repository census.

## Documentation and generated dependencies

Command-catalog documentation promotes all registered commands. The only
dedicated current guide found was `docs/guide/sql-format.md`. No generated
artifact, model metadata, source freshness contract, or another CLI command
consumes formatter/lint/outline/graph/slice output. `query uses` output is a
standalone JSON/text/dot report; it also has no downstream automated consumer.

This absence does not by itself determine removal. It means any retained
capability must justify its own optional, on-demand value rather than an
indirect Golden Path dependency.
