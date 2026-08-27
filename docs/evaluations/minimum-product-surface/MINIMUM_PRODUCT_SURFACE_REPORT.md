# Minimum Product Surface Audit

## Classification: `minimum-surface-ready-for-reduction`

The measured Golden Path needs a narrow product core: canonical SQL,
deterministic named-parameter compilation and binding, generated binding
freshness, native `pg`, and an optional PostgreSQL contract. It does not require
the scaffold-first feature architecture, generated DTO/mapper/test assets, a
mandatory adapter, or general SQL productivity tooling.

This does not make every non-core surface valueless. The audit distinguishes
independent deterministic value from historical coupling, and recommends staged
reduction rather than broad deletion. No product code or existing documentation
changes in this branch.

## Cross-product result

| Classification | Surface families |
| --- | --- |
| keep-core | named-parameters compiler/binder; CLI's Golden-Path generation/freshness responsibility; command descriptor/discoverability |
| keep-optional | standalone PostgreSQL contract; PostgreSQL adapter convenience; lint; SQL resource compatibility; DDL migration generation; DDL pull; formatter; safe sort; optional compression; query analysis/uses; gate scaffold |
| compatibility-only | MySQL/MSSQL adapters; feature contract/check paths for existing generated applications |
| deprecate-remove | init-heavy starter; feature scaffold/import/query; generated DTO/mapper and mapper checks; ZTD/testkit ownership; Atlas starter integration |
| remove-now | no public surface meets this threshold without a compatibility census |
| needs-one-more-evidence | perf; RFBA; private `ddl-docs-cli` |

The retained optional surfaces need not be promoted in Getting Started. Their
continued ownership is conditional on their own deterministic benefit, not on
the Golden Path.

## Reduction gates / unresolved evidence

The following are evidence gates, not product surfaces or classifications:

- generated-feature consumer compatibility census;
- ZTD/testkit consumer census;
- published package adoption census;
- generated consumer-repository compatibility assessment.

They are required before Batch 2 or Batch 3 deprecation/removal decisions.
