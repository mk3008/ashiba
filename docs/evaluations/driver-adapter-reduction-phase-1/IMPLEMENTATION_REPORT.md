# Driver Adapter Reduction Phase 1

## Starting surface

At `9ca87b249297060e0d9af1e29be40545ae423d24`, Ashiba published MySQL and SQL
Server driver adapter packages. Each duplicated settled named-parameter binding
and delegated one call to the selected native driver. Neither had a current
Ashiba product consumer. `@ashiba-ts/driver-adapter-core` also exposed a retry
policy helper with no consumer outside its own tests and a PostgreSQL adapter
README reference.

| Before | After |
| --- | --- |
| 7 public workspace packages, including MySQL and SQL Server wrappers | 5 public workspace packages; both DBMS wrappers absent |
| MySQL/MSSQL adapter → core → named parameters → native driver | named parameters → native mysql2 or mssql |
| Core retry policy/types/tests as an Ashiba public surface | application-owned retry policy; no Ashiba retry helper |

## Implemented reduction

- Removed `@ashiba-ts/driver-adapter-mysql2`, including its public API,
  README, changelog, tests, and workspace/publish graph entries.
- Removed `@ashiba-ts/driver-adapter-mssql` on the same terms.
- Removed `withAshibaRetry`, its retry policy/types/error, retry-only helpers,
  retry tests, and retry documentation from `@ashiba-ts/driver-adapter-core`.
- Added a concise public migration note for the removed public packages.

No compatibility package, forwarding wrapper, hidden alias, or no-op adapter
was retained.

## Remaining core responsibility

`@ashiba-ts/driver-adapter-core` remains in this phase because the deferred
PostgreSQL adapter and current Support Inbox example still consume its query
model, execution-event, query-source, cardinality, safe-sort, and optional
condition types/helpers. Removing or relocating those would decide the
deferred PostgreSQL adapter and optional-capability work, which is outside
Phase 1. Its retained surface is not evidence that the removed MySQL or SQL
Server wrappers remain necessary.

| Capability | Phase 1 state | Current consumer/reason |
| --- | --- | --- |
| named binding metadata | retained | Golden Path and selected native drivers |
| query model/execution-event/query-source/cardinality contracts | retained | deferred PostgreSQL adapter and Support Inbox |
| safe sort / optional-condition helpers | retained, decision deferred | explicit productization/final-placement decision remains out of scope |
| retry policy/helper | removed | no remaining product consumer; application-owned by Scope |
| MySQL/MSSQL adapter orchestration and observer wrappers | removed | no current product consumer; native driver baseline |

## Native-driver boundary and DBMS support

MySQL/mysql2 and SQL Server/mssql remain supported secondary DBMS targets.
The supported execution shape is:

```text
canonical SQL
→ deterministic binding metadata
→ bindNamedParameters
→ native driver
→ application/live tests
```

PostgreSQL/pg remains PRIMARY. Native drivers remain the baseline execution
owner. The named-parameter core, standalone PostgreSQL contract, Scope, and
Golden Path are unchanged.

## Compatibility and release impact

The two deleted packages were public. Consumers must migrate to the documented
native-driver boundary in a breaking release. The migration note is the release
guidance; this phase intentionally does not publish an empty or deprecated
package.

## Deferred to Phase 2 or later

- PostgreSQL adapter ordinary execution wrapper and its remaining core coupling.
- Runtime source-hash gate placement.
- Safe-sort final ownership.
- Optional-condition compression productization and placement.
- Support Inbox PostgreSQL adapter migration.

## Verification and cleanup

Verification commands and results are recorded after implementation in
`VERIFICATION.md`. No benchmark or DBMS support reduction was performed. Any
temporary databases or containers used by verification are cleaned up after
their checks finish.
