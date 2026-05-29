# @ashiba-ts/cli

## 0.1.0

### Minor Changes

- [#1](https://github.com/mk3008/ashiba/pull/1) [`b451b4d`](https://github.com/mk3008/ashiba/commit/b451b4dcf395e71d2e68351880a013e9ba3a4546) Thanks [@mk3008](https://github.com/mk3008)! - Add the initial Ashiba CLI and package surface for SQL-first Runtime Zero scaffolding.

  The CLI now creates a PostgreSQL-backed starter with visible SQL, editable feature/query boundaries, executable Zero Table Dependency mapper tests, dry-run scaffold flows, migration DDL generation, and isolated customer tutorial verification. It also includes the initial driver adapter contracts, `pg` driver wrapper, `pg` testkit adapter, and `pg_dump` DDL pull helper package.

- [#8](https://github.com/mk3008/ashiba/pull/8) [`d8e0689`](https://github.com/mk3008/ashiba/commit/d8e0689dd98d1e26eee6579c94113531307b8c2a) Thanks [@mk3008](https://github.com/mk3008)! - Simplify scaffold command names around optional search conditions and feature boundaries.

  The CLI now exposes `ashiba query optional add|refresh|remove` instead of the previous `query sssql` command group. Generated query models and PostgreSQL execution options now use `optionalConditionCompression` so customer-facing scaffolded code no longer contains the SSSQL term.

  Feature scaffolding commands now use positional names for the primary target, for example `ashiba feature scaffold users-list --table users --action list` and `ashiba feature query refresh users-list list`, removing redundant `--feature-name`, `--feature`, and `--query-name` flags from the main workflow.

### Patch Changes

- [#1](https://github.com/mk3008/ashiba/pull/1) [`1c70b21`](https://github.com/mk3008/ashiba/commit/1c70b21d1ad826f28dc4965e1bfaa81a12771738) Thanks [@mk3008](https://github.com/mk3008)! - Document and enforce file-backed runtime SQL boundaries and exact safe-sort whitelist matching.

  The PostgreSQL adapter now exposes query source objects instead of a bare runtime SQL string as the execution input. CLI scaffolds also generate query source objects for feature and starter executors. Safe-sort tests now verify that sort keys must exactly match the query model whitelist.

- [#1](https://github.com/mk3008/ashiba/pull/1) [`6521842`](https://github.com/mk3008/ashiba/commit/6521842760401bffee7cca6b48988a0d47f6e7f1) Thanks [@mk3008](https://github.com/mk3008)! - Add optional SSSQL condition compression metadata to model generation and enable explicit metadata-backed compression in the PostgreSQL adapter.
