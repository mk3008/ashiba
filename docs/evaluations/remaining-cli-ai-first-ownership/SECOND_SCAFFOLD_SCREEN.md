# Second-scaffold screen

The screen asks whether a command freezes an ordinary AI/project/tooling task
as an Ashiba convention, rather than whether the command is convenient.

| Capability | Screen result | Replacement operating model |
| --- | --- | --- |
| `config` | second scaffold | AI writes the small project-local configuration only when a selected external/generic tool needs it. |
| `check` | second scaffold | repository `verify` script runs the checks the application actually owns. |
| `project check` | rule, not framework | a local script invokes the named compiler across the project’s visible SQL roots. |
| `describe command` | second-order scaffold | normal `--help`, package README, and source/package inspection after the command set is small. |
| `model-gen` | generated-state lifecycle | prior direct-compile Arm C removes duplicate state and its freshness checker. |
| `sql-resource snapshot/compare` | unresolved generated-state lifecycle | a dedicated fleet-review ablation must compare direct PostgreSQL results and git/native artifacts to committed snapshots. |
| `query uses` | not a scaffold | AST-backed, fail-closed repository analysis is a real capability; scope fit remains the question. |
| DDL lint | not a scaffold | explicit DDL plus AST checks are a real capability; it is still generic SQL/DDL tooling. |
| PostgreSQL contract | not a scaffold | PREPARE/catalog evidence is real; it is a PostgreSQL generic proof, not a core mapper need. |

The result rejects the circular logic “a larger Ashiba CLI needs a discovery
command, therefore discovery must remain.” It also rejects the analogous
generated-state logic already disproved by the model-gen no-artifact arm.
