# Package Ownership Assessment

## `@ashiba-ts/driver-adapter-core`

**Recommendation: REMOVE after type extraction.**

The package no longer owns a shared execution abstraction. Its remaining
exports are a mixture of named/CLI-generated metadata contracts, optional
PostgreSQL contract types, and safe-sort helpers. Those do not establish a
single shared runtime package reason. A future reduction must place each type
with its producer or retained narrow consumer and remove public exports that
only supported the former adapter architecture.

## `@ashiba-ts/driver-adapter-pg`

**Recommendation: REDUCE; do not retain it as a general adapter package.**

Ordinary preparation delegates to named core and returns data for native pg.
Source hash, safe sort, and contract profile do not independently justify the
package. If optional compression is eventually productized, it needs a narrow,
explicit boundary; it may temporarily use this location while that separate
decision is open, but the location is not the product decision.

## Compatibility

Both packages are public. Any implementation must be a deliberate breaking
change with a migration note, not an alias, hidden adapter, or forwarding
wrapper. Existing generated metadata may continue as application artifacts
until its real consuming capability is removed. Compatibility does not reverse
the ownership decision.

## DBMS support

This package assessment does not alter PostgreSQL PRIMARY, MySQL/mysql2
SUPPORTED-SECONDARY, SQL Server/mssql SUPPORTED-SECONDARY, or native drivers as
baseline execution owners.
