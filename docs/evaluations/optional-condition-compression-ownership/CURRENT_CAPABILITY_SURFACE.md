# Current Capability Surface

## Runtime and metadata path

```text
canonical optional guard SQL
  -> CLI optional analysis
  -> source ranges + PostgreSQL-lowered ranges/replacement text
  -> generated query.meta.ts / binding metadata
  -> preparePostgresQuery(..., { optionalConditionCompression: true })
  -> source/range/text validation and branch subtraction
  -> named binding/renumbering
  -> application-owned pg.query(sql, values)
```

The runtime implementation is in `packages/driver-adapter-pg/src/index.ts`.
It validates source hash, analysis/binding branch correspondence, range bounds,
source/compiled range text, PostgreSQL placeholder renumbering, and interaction
with safe-sort coordinates. It does not execute SQL itself.

## Build-time and authoring surface

* `packages/cli/src/commands/sql-optional-condition-compression-metadata.ts`
  derives source-coordinate facts.
* `model-gen` and `query optional` derive PostgreSQL-lowered coordinates and
  place them in generated metadata.
* `ashiba query optional add|refresh|remove` is a three-command public authoring
  and refresh surface.
* `docs/guide/sssql.md` documents legacy/current implementation behavior.

## Package coupling

The capability currently reaches across the public pg adapter, public core
metadata types, CLI analysis/generation, generated artifact schema, command
catalog, guide, tests, and application opt-in flags. It is PostgreSQL-specific:
the compiled coordinate system is `$n` SQL after named lowering. It requires
neither a native-driver execution wrapper nor logging/transaction ownership,
but current placement still carries those package compatibility obligations.

## Inventory reference

| Surface | Inventory value |
| --- | --- |
| `driver-adapter-pg/src/index.ts` | 840 lines; compression is mixed with ordinary preparation and safe sort |
| `driver-adapter-core/src/index.ts` | 478 lines; contains query-model and compression metadata contracts |
| CLI `query.ts` | 816 lines; owns public optional authoring/refresh commands |
| CLI coordinate analyzer | 602 lines; owns optional branch/range analysis |
| current generated metadata files with field | 11 files / 67,810 bytes across Support Inbox and Transfer |

Line counts are Maintenance Surface inventory, not a decision score.
