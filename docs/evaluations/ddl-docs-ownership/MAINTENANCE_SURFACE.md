# Maintenance Surface

## Ashiba product Maintenance Surface

**Target ownership: 0 for `ddl-docs-cli`.**

The logical decision removes DDL-docs/Transfer capability ownership from the
Ashiba product boundary. Ashiba should not acquire generic DDL metadata,
ConceptSpec, review-plan, DFD, or policy-framework responsibilities merely to
preserve these checks.

## Repository-local experimental maintenance

While Transfer and `ddl-docs-cli` remain temporarily colocated, this repository
can still carry real maintenance cost:

- the private package boundary and build configuration;
- Transfer docs generation;
- retained deterministic tests;
- temporary root/workspace integration;
- historical package namespaces and package-local guidance.

These surfaces are **repository-local experimental maintenance**, not Ashiba
product Maintenance Surface. Their existence does not make repo maintenance
cost zero, nor does it imply Ashiba product ownership.

The current private package may remain as temporary build isolation. The
historical `@ashiba-ts/ddl-docs-cli` name need not be cleaned up before a likely
Transfer extraction because an interim rename could create a second migration.

## Rendering versus verification

Rendering Markdown/VitePress pages is generic convenience. Verification catches
real stale table/column/index/constraint references, invalid metadata, missing
DDL order entries, broken relationships, and review-plan mapping failures. That
deterministic failure-prevention value should be retained where useful to
Transfer, while remaining outside Ashiba product ownership.

Physical relocation is deferred: current behavior works, location is not a
product bug, relocation alone adds no user value, and the one-time repository
churn is more naturally paid with a possible future Transfer extraction.
