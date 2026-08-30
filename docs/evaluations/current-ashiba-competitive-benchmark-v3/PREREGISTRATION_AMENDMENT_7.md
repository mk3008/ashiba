# Preregistration amendment 7: entrypoint manifest completeness

## Status at correction

Primary scored-cell count remains **0**. The final v2 GO audit found one
evidence-manifest completeness defect after amendment 6; no candidate result is
affected.

## Correction

Candidate source snapshots deliberately omit transient `dist` and `build`
directories from broad traversal. The declared built entrypoint is now included
explicitly in both snapshots **and** in the final SHA-256 evidence manifest.
The executor self-test verifies both before-execution and before-cleanup
entrypoint snapshot paths and their hashes in the finalized manifest.

## Binding freeze

The first commit containing this amendment and a passing v2 packet verifier is
the sole `executionPacketFreezeSha` for primary scored cells. It supersedes the
proposed amendment-6 freeze before any candidate dispatch. Further protocol
changes require a new correction and invalidate all affected cells.
