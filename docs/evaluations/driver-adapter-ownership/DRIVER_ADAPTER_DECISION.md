# Driver Adapter Decision

## Final decision

**`REDUCE` the driver-adapter family.**

| Surface | Classification | Rationale |
| --- | --- | --- |
| MySQL adapter | REMOVE | no current product consumer; wrapper duplicates named core/native call |
| SQL Server adapter | REMOVE | no current product consumer; wrapper duplicates named core/native call |
| core package | REMOVE with residual type extraction only if independently justified | current package includes application architecture, retry, and logging ownership outside Scope |
| PG adapter normal execution | REMOVE | native PG Golden Path is already demonstrated |
| PG safe sort | REDUCE | finite application rule is sufficient for minimum path |
| PG optional compression | KEEP OPTIONAL / unresolved productization | narrow stale-coordinate proof remains, but is not core |
| PostgreSQL contract | KEEP OPTIONAL outside adapters | standalone CLI capability already exists |

## Scope and Golden Path

Scope change required: **no**. Golden Path change required: **no**. The selected-driver/DBMS support matrix is unchanged. The result concerns wrapper ownership, not execution support.

## Compatibility

All packages are public. A future removal is major-release/migration-note work. Existing generated query metadata may remain ordinary application artifacts; removal must not leave a compatibility shim or preserve a broad adapter only for existing consumers.

## Unresolved items

1. Optional-condition compression is explicitly productization pending in Scope. Its eventual package/location and public contract need a separate narrow decision.
2. Any residual runtime source-hash guard must be justified as a small independent verifier, not recreated inside a new generic adapter.
3. Support Inbox requires an application-native migration proof before implementation; it is evidence of current coupling, not a reason to keep the package.

## Reconsideration trigger

Reopen package ownership only if multiple independent applications require the same adapter-bound deterministic guard and native-driver/application glue repeatedly fails in a measurable way. A new driver, wrapper convenience, or existing test count is not sufficient.
