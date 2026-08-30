# Preregistration amendment 8: clean-room cell materialization

## Status at correction

Primary scored-cell count remains **0**. This correction adds the deterministic
candidate-directory materialization step before the first candidate dispatch.

## Correction

The frozen arm manifests use the supplied Ashiba tarball as a relative
`file:` reference. The materializer copies the exact tarball into each Arm A
clean room, rewrites only that relative reference, and performs lock-based
`npm ci --ignore-scripts`. It copies no workspace source or solution example.
The runner permits this supplied copy only by package identity and SHA-256.

Every cell is therefore created outside the worktree from the same frozen
packet with the same visible inputs. The materializer itself is packet input
and its Arm A install/static-inspection smoke is calibration only, not a
scored candidate result.

## Binding freeze

The first commit containing this amendment and a passing v2 verifier is the
sole `executionPacketFreezeSha` for primary scored cells, superseding the
amendment-7 proposal before any dispatch.
