# Maintenance Surface

## Current package burden

Keeping the two public packages means maintaining public exports, package
versioning, README claims, package tests, a pg live smoke, peer dependency
compatibility, generated metadata contracts, and application migration
guidance. It also makes every residual capability appear as one PostgreSQL
adapter product even though their owners differ.

## Capability-specific burden

| Surface | Durable cost | Evidence of independent value |
| --- | --- | --- |
| ordinary preparation wrapper | pg API/metadata coupling and application import | none beyond named core |
| runtime hash gate | runtime hashing plus duplicated freshness contract | only transform-local use |
| safe sort | coordinate metadata, profile API, runtime splice, package tests | Rule Only; no package justification |
| optional compression | coordinate schema, verifier, tests, docs, version/freshness | optional early stale-proof only |
| contract profile | public option tied to caller parser policy | contract compatibility, not preparation |
| shared core package | public type bundle and package migration | no remaining demonstrated cross-driver runtime guard |

## Package conclusion

The package boundary adds more maintenance than it removes for the normal
binding path. A temporary residual location can be justified only while the
optional coordinate proof awaits its explicit productization decision. That is
not an endorsement of the present package as a permanent adapter.
