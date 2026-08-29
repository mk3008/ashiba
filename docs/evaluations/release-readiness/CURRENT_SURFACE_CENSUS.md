# Current user-surface census

The release-facing surface is deliberately small:

- `@ashiba-ts/named-parameters`: deterministic named binding and missing/unused
  value rejection.
- `@ashiba-ts/cli`: model generation/freshness, narrow DDL-backed lint, query
  uses, SQL-resource snapshot/compare, and the optional PostgreSQL contract.
- Canonical `.sql` files, generated binding metadata, a native driver, and
  application/live tests form the normal path.

The command catalog was inspected from the built CLI. It contains no removed
formatter, advisory lint, graph, outline, slice, scaffold, adapter, migration,
or `pg_dump` wrapper command. Package manifests expose only the CLI and named
parameters as public Ashiba packages; `ddl-docs-cli` remains private and
detached experimental tooling.

Current user docs are the root README, docs home, AI-first guide, consumer
AGENTS sample, architecture references, package READMEs, and generated command
reference. Historical decisions remain under `docs/evaluations/` and are not
current guidance.
