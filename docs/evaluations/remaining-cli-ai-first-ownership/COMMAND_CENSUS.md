# Current command census

The observed binary catalog and its source registration agree on eleven public
entries. `ashiba --help` and `ashiba describe command --format json` were run
after a local build. The catalog has two usage-text defects: both
`sql-resource` entries claim a positional `<path>`, whereas snapshot accepts
`--out` and compare requires `--before` and `--after`.

| Command | Registration | Current consumer classification | Direct Builder Mapper need |
| --- | --- | --- | --- |
| `check` | `commands/check.ts` | historical dogfood documentation; no standard required consumer | no |
| `config` | `commands/config.ts` | registration/catalog only | no |
| `describe command` | `commands/describe.ts` | README and AI-first guide | no |
| `model-gen` | `commands/model-gen.ts` | Ticket Queue references and generated-artifact CI | no longer standard; prior REDUCE |
| `project check` | `commands/project.ts` | root `project:check`, Support Inbox `check:sql`, CI | compilation rule only |
| `postgres-contract` | `commands/standalone-postgres-contract.ts` | Ticket Queue reference verification/CI | optional PostgreSQL proof |
| `lint` | `commands/lint.ts` | focused tests/docs; no app/CI script consumer | optional generic DDL proof |
| `query uses table` | `commands/query.ts` | focused tests/docs; no app/CI script consumer | optional generic impact search |
| `query uses column` | `commands/query.ts` | focused tests/docs; no app/CI script consumer | optional generic impact search |
| `sql-resource snapshot` | `commands/sql-resource.ts` | unit/live tests/docs; no app/CI script consumer | optional fleet proof |
| `sql-resource compare` | `commands/sql-resource.ts` | unit/live tests/docs; no app/CI script consumer | optional fleet proof |

`packages/cli/src/index.ts` registers every entry and then applies the catalog.
The relevant current consumers are intentionally separated from historical
dogfood and test-only references; existence of a test does not count as
adoption.
