# RFBA Removal Inventory

RFBA is a structural Scope conflict: `ashiba rfba inspect` evaluates prescribed
feature/query boundary architecture, while Scope assigns application architecture
to the application. Value was not re-evaluated.

| Exposure | Evidence | Breaking category | Strategy |
| --- | --- | --- | --- |
| CLI | index registration and command catalog | docs/tooling | remove-next |
| implementation | `packages/cli/src/commands/rfba.ts` | build/test | remove-next |
| tests/docs | CLI smoke tests, README and generated command docs | test/docs | remove-next with migration note |

Reconsideration trigger: a human Scope change only.
