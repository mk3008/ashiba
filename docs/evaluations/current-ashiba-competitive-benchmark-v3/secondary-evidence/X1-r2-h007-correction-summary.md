# H-007 X1 correction rerun

H-007 changed only the secondary static-isolation classifier.  It now permits
the exact sibling packed Ashiba tarball supplied to Arm A and continues to
reject every other relative Ashiba/worktree reference.  The correction does
not modify the frozen primary packet or any X1 r1 evidence.

Because the classifier is shared by every X1 arm, all six non-aggregate X1
cells were newly materialised outside the repository under separate
`C:\tmp\ashiba-benchmark-v3-secondary-h007\X1-<arm>-r2` roots.  Each root had
its own candidate directory, evidence directory, npm cache, and runner nonce
schema/role.  The frozen materialiser still writes `X1-<arm>-r1` in its packet
metadata; `r2` is a correction-run label added outside that frozen input.

| Arm | Initial result | Repair | final runner result | Notes |
| --- | --- | --- | --- | --- |
| A | TypeScript compile failure | 1 candidate type repair | P | `ParameterBinding` map inference was corrected; static isolation, all runner checks, final DB state, and cleanup passed. |
| P | Candidate entrypoint missing | 0 | F | The Prisma 8 RC candidate did not produce a runnable application entrypoint.  Runner records the missing-module failure and cleanup; this is preserved as a failure, not retried with native pg. |
| S | sqlc YAML plugin `path` unsupported | 1 candidate/config repair | P | The exact sqlc 1.31.1 binary and v0.1.3 WASM were fetched and digest-verified; `url` plus the pinned SHA-256 generated the TypeScript query module. |
| D | Drizzle expanded a JS array into two placeholders inside `ANY` | 1 candidate repair | P | Used Drizzle `sql.param` for the PostgreSQL text-array parameter; no direct `pg` query path was used. |
| K | P | 0 | P | Kysely SQL builder/raw-builder path passed static isolation and all X1 checks. |
| G | P | 0 | P | Native `pg` control passed static isolation and all X1 checks. |

The candidate source snapshots, exact packet copies, runner JSON (including
pre-cleanup database state and cleanup), and per-source SHA-256 manifests are
stored next to each arm under `secondary-evidence/X1-<arm>-r2/corrected-h007`
and `secondary-candidate-snapshots/X1-<arm>-r2/corrected-h007`.

This is a non-aggregate correction replay.  It does not alter primary-cell
results or make a cross-arm ranking claim.
