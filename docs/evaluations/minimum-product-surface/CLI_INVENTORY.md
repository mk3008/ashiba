# CLI Inventory

The command catalog (`packages/cli/src/commands/command-catalog.ts`), not README,
was the inventory source.

| Family | Public commands observed | Classification |
| --- | --- | --- |
| minimum core | `check`, `project check`, `check-contract`, `model-gen`, `postgres-contract write/check`, `config`, `describe command` | **keep-core**; reduce overlaps after standalone contract/freshness migration evidence. |
| scaffold architecture | `init`, `atlas init`, `feature scaffold/import/query scaffold/query refresh`, `feature contract check`, `feature tests scaffold/check` | **deprecate-remove**; feature tests and mapper checks are coupled to generated architecture. |
| passive integration | `gate scaffold` | **keep-optional**; deterministic ordinary-gate installation, independent of feature scaffold. |
| SQL compatibility | `sql-resource snapshot/compare`, `ddl migration generate` | **keep-optional**; deterministic fleet/schema review, not database apply ownership. |
| SQL productivity | `lint`, `query lint`, `query format`, `query outline/graph/slice`, `query uses table/column` | **keep-optional** pending per-family usage/evidence; do not position as core. |
| dynamic convenience | `query optional add/refresh/remove`, safe-sort metadata generation | **keep-optional**; retain only if limited proof/fail-closed benefit remains demonstrable. |
| performance/review | `perf init/run/scenario init/scenario measure/report diff`, `rfba inspect` | **needs-one-more-evidence**; valuable evidence tooling but broad command/config/report surface. |

`feature contract check` exists in the command catalog on current main. The
Golden Path fresh packaged run observed an older published CLI lacking it; that
is a release/documentation compatibility finding, not proof that current source
is dead.
