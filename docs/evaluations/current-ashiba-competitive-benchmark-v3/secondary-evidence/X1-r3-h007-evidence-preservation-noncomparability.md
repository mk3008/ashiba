# H-007 X1 r3 evidence-preservation remeasurement: non-comparable

This directory records a fresh, isolated **r3 evidence-preservation
remeasurement** for X1 Arms A, S, and D. It is not a scored cell, is not pooled
with X1 r1/r2, and does not replace any earlier evidence. The sole purpose was
to correct an evidence-preservation defect: the H-007 r2 terminal outcomes had
not retained source and command evidence for their initial failing attempts.

## Frozen inputs and isolation

Each arm used the unmodified X1 r1 packet, the H-007 static-isolation helper,
Node 24.18.0/npm 11.16.0, a fresh external candidate directory, a separate
npm cache, and a separate external packet/evidence root. The packet copy,
initial candidate source snapshot, static-isolation output, `npm ci` output,
and command logs were copied into the repository before any cleanup. SHA-256
manifests cover each retained evidence and candidate-snapshot tree.

External roots used for this aborted remeasurement were:

- `C:\\tmp\\ashiba-benchmark-v3-secondary-h007-preservation-r3\\X1-A-r3`
- `C:\\tmp\\ashiba-benchmark-v3-secondary-h007-preservation-r3\\X1-S-r3`
- `C:\\tmp\\ashiba-benchmark-v3-secondary-h007-preservation-r3\\X1-D-r3`

## Observed result and stop rule

The r3 procedure was required to stop rather than manufacture a match when an
initial result differed from the corresponding r2 record. That condition
occurred before any runner or repair was run:

| Arm | Retained initial evidence | Observed r3 result | Why it is non-comparable |
| --- | --- | --- | --- |
| A | source, packet, static isolation, npm install, typecheck | static isolation PASS; typecheck PASS | The staged `Map` inference perturbation did **not** reproduce r2's type-system failure. No replacement defect was introduced. |
| S | source, packet, static isolation, npm install, generator log, toolchain digest manifest | static isolation PASS; generator FAIL | The copied r2 candidate retained an obsolete absolute sqlc binary path, so generation stopped with a missing-path environment-preparation failure rather than the r2 YAML-plugin semantic failure. No path rewrite or candidate repair was applied. |
| D | source, packet, static isolation, npm install, typecheck | static isolation PASS; typecheck PASS | The initial source and typecheck were retained, but runner execution was not started after the A/S divergence stop condition. |

No candidate repair, build, runner/oracle execution, database fixture, or
cleanup result is claimed for r3. Consequently there is no r3 final outcome,
repair count, live result, or treatment-fidelity result.

## Durable locations

For each arm, retained files are under:

- `secondary-evidence/X1-<arm>-r3/evidence-preservation-remeasurement-h007/`
- `secondary-candidate-snapshots/X1-<arm>-r3/evidence-preservation-remeasurement-h007/initial/`

The arm evidence root contains `attempt-initial.json`, `packet/`, command
logs, initial source/snapshot manifests, and a pre-cleanup durable-tree
manifest. Arm S additionally records the exact sqlc and plugin SHA-256
digests in `toolchain-manifest.json` without committing the temporary binary
or WASM.

After the source/snapshot hash verification passed for all three arms, the
three exact external roots listed above were removed. Each arm's
`cleanup-status.json` and `durable-evidence-manifest-after-cleanup.json`
record that cleanup without claiming a runner-created database cleanup.

This preserves the divergence honestly. It does not support a claim about the
original r2 terminal outcomes and it must not be used for cross-arm comparison.
