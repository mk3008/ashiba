# Decision and implementation boundary

## Final classifications

| Classification | Commands / capabilities |
| --- | --- |
| KEEP-AS-CORE | none of the remaining CLI commands; named compiler/binder is a library primitive |
| RULE-ONLY | `project check` |
| REHOME-AS-GENERIC-TOOL | `lint`, `query uses table`, `query uses column`, `postgres-contract` |
| REMOVE | `check`, `config`, `describe command` |
| NEEDS-FOCUSED-ABLATION | `sql-resource snapshot`, `sql-resource compare` |
| prior decision | `model-gen`: REDUCE |

Builder Mapper is visible canonical SQL, deterministic named compilation,
binding rejection, reviewed finite composition, and native-driver handoff.
No remaining CLI command is required to make that sequence work. Useful
deterministic commands are optional proof or generic SQL tooling, not core.

## Recommended implementation order

1. Plan the breaking removal of `check`, `config`, and `describe command` after
   an external npm/CLI consumer census and migration guidance.
2. Replace `project check` with an application-owned direct compiler rule while
   migrating the prior model-gen REDUCE decision; do not invent another project
   framework.
3. Separately prove an independent consumer and separable dependency boundary
   before rehoming query uses, DDL lint, or the live PostgreSQL contract.
4. Run a no-persistent-fleet-artifact ablation for `sql-resource`; remove it
   rather than rehome it if no real consumer appears.

Evidence strength: **medium**. PostgreSQL contract and SQL-resource live
mutation proof were not rerun because database credentials were unavailable;
the query scale control has no independent Fresh-Agent runtime; external npm
adoption is unknown. Scope, Golden Path, product code, and current user docs
are unchanged.
