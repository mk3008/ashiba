# @ashiba-ts/cli

## 0.3.0

### Minor Changes

- [#25](https://github.com/mk3008/ashiba/pull/25) [`95e5000`](https://github.com/mk3008/ashiba/commit/95e5000bbbe0f2867dc5798bcb8a5d244a488dff) Thanks [@mk3008](https://github.com/mk3008)! - Add `ashiba feature import <feature> <query> --sql <path>` to scaffold a feature boundary, query DTO contracts, metadata, and ZTD mapper-test assets around an existing SQL file.

  Generated mapper tests now use lightweight synthetic DB result probes so they prove DTO mapping compatibility without pretending to prove source SQL business logic.

  Imported SQL result nullability is conservative but leveled: confirmed nullable DTO drift fails, while uncertain nullability narrowed by customer-owned DTO code is reported as a warning.

## 0.2.1

### Patch Changes

- [#23](https://github.com/mk3008/ashiba/pull/23) [`d103fe0`](https://github.com/mk3008/ashiba/commit/d103fe0f86f8751da8a04020f8d82f437585fa95) Thanks [@mk3008](https://github.com/mk3008)! - Fix the CLI version output and make `ashiba init --db postgres --driver pg` add `"type": "module"` when an npm-initialized package does not declare a module type, so generated `import.meta` based starter code typechecks without manual package metadata edits.

## 0.2.0

### Minor Changes

- [#16](https://github.com/mk3008/ashiba/pull/16) [`55e096e`](https://github.com/mk3008/ashiba/commit/55e096ebc447f75bf11ba81c0b948bd3e303bd16) Thanks [@mk3008](https://github.com/mk3008)! - Add git ref DDL inputs to `ashiba ddl migration generate`. Use `--from-git <ref:path>` or `--to-git <ref:path>` to compare committed DDL snapshots with local files or directories and write reviewable migration SQL.

  Improve drift repair guidance in project checks so failed generated mapping-test diagnostics point to the visible SQL, editable query boundary, and generated assets that should be refreshed.

  Refresh generated query metadata when `ashiba query format --write` changes feature SQL, and add `ashiba query format --all` for formatting every configured SQL root in stable order.

- [#14](https://github.com/mk3008/ashiba/pull/14) [`3bd705c`](https://github.com/mk3008/ashiba/commit/3bd705c22e21c93850646c771b34b4b3e1bd54e6) Thanks [@mk3008](https://github.com/mk3008)! - Add safe SQL formatting support:

  - Newly scaffolded SQL is formatted with configurable defaults.
  - `ashiba query format` formats existing SQL only after safety checks.
  - SSSQL optional rewrites avoid whole-file reformatting unless rawsql-ts reports a targeted safe rewrite.

  Fix PostgreSQL optional-condition compression when every WHERE predicate is an SSSQL branch so the adapter removes the whole WHERE clause instead of producing dangling SQL or rejecting overlapping branch ranges.

### Patch Changes

- [#18](https://github.com/mk3008/ashiba/pull/18) [`e21a9f3`](https://github.com/mk3008/ashiba/commit/e21a9f3485ac2b96561c842152ca65c571a42907) Thanks [@mk3008](https://github.com/mk3008)! - Add common PostgreSQL transaction options to the generated pg starter. `withPgTransaction` now supports isolation level, read/write access mode, and deferrable flags while keeping rare transaction policy in customer-owned starter code.

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
