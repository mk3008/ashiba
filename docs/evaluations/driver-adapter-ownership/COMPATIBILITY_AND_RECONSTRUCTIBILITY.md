# Compatibility and Reconstructibility

All adapter packages are public. Future removal is a major-release change with a migration note, but public compatibility is not a keep reason.

## Reconstructibility

| Adapter behavior | Ordinary replacement | Cost / caveat |
| --- | --- | --- |
| mysql2/mssql execute wrapper | generated binding metadata + `bindNamedParameters` + native `execute` or `request.input/query` | small application glue; named core remains |
| observer and mask policy | application logger/telemetry wrapper | application already owns logging/telemetry policy |
| retry helper/classifier | application-owned error policy | application owns idempotency and retry safety |
| query executor/cardinality | local function/type | application architecture, not SQL core |
| source-hash comparison | build-time freshness; bounded local comparison only where runtime SQL can mutate | do not replace it with a generic runtime framework |
| safe sort / optional compression | not treated as ordinary replacement | retain/evaluate the narrow deterministic capability separately |

Already-generated metadata remains ordinary application code/artifacts. An implementation task must document whether an application can continue using its current metadata with direct native calls or should regenerate a smaller artifact. This evaluation does not define that migration.
