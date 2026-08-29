# Current CLI Surface Inventory

Starting commit: `bc67816229620b1ae935b969106baadac9d2ff73`.

This inventory is source-based. It deliberately excludes migration, DDL pull,
SQL resource, named binding, model generation, and standalone PostgreSQL
contract commands because they have different ownership decisions.

| Capability | Current public operation(s) | Primary implementation | What it produces or detects | Golden Path dependency |
| --- | --- | --- | --- | --- |
| Formatter | `query format` | `commands/query.ts`, `sql-format.ts` | Formatting diff; optional guarded write | None |
| DDL-aware lint | `lint` | `commands/lint.ts`, `sqlgrep/query/lint.ts` | SQL diagnostics plus DDL-reference/type checks | None |
| Query lint | `query lint`; internal to `lint` | `sqlgrep/query/lint.ts` | CTE, join, duplication, templating-risk, and size advice | None |
| Uses | `query uses table`, `query uses column` | `sqlgrep/query/analyzeTableUsage.ts`, `analyzeColumnUsage.ts`, `targets.ts` | Repository query-table/column reference report | None |
| Structure | `query outline`, `query graph` | `sqlgrep/query/structure.ts`, `report.ts` | CTE/table dependency summaries and graph renderings | None |
| Slice | `query slice` | `sqlgrep/query/slice.ts` | A debug SQL slice for selected CTEs | None |

The command catalog exposes the eight operations above. CLI registrations are
in `packages/cli/src/index.ts`; the catalog is in
`packages/cli/src/commands/command-catalog.ts`.

## Implementation surface

The optional query/reporting implementation is concentrated in
`packages/cli/src/sqlgrep/query/`: AST analysis, table/column usage analysis,
formatting, linting, structure reporting, slicing, locations, targets, and
renderers. `packages/cli/src/commands/query.ts` is the public orchestration
layer; `packages/cli/src/commands/lint.ts` invokes query lint and adds
DDL-model checks.

There were no direct tests for this family in `packages/cli/tests/` at the
starting commit. The standard `pnpm verify` path did not invoke these commands
or consume their output. This is maintenance and confidence evidence, not an
independent removal reason.

## Important non-optional formatter uses

The optional `query format` command is not the only use of `SqlFormatter`.
`commands/ddl-schema-model.ts` and `commands/sql-result-columns.ts` use the
formatter for their own retained processing. `model-gen` source normalization
is only newline normalization (`normalizeSqlSource`), not `query format`.
Consequently, removing the optional command would not remove the formatter
library from retained product operations and would not change source-hash or
freshness semantics by itself.
