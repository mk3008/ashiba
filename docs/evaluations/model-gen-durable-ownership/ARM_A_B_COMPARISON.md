# Arm A / B / C comparison

All arms used the same frozen ticket schema and final PostgreSQL behavioral
authority. Arm C adds the necessary “do not create the artifact” control to
the earlier static-artifact comparison.

| Measure | Arm A — current workflow | Arm B — primitive-only static artifact | Arm C — primitive-only no artifact |
| --- | --- | --- | --- |
| Ashiba input | CLI + named package | named package only | named package only |
| Lowering source | model-gen generated module | application-owned compiler-derived module | controlled direct compiler cache |
| Committed duplicate binding state | yes | yes | no |
| Source hash | yes | no | no |
| Generic freshness check | byte-for-byte `--check` | no | no target exists |
| Initial live SQL repair | typed nullable status guard | typed nullable list guards | typed nullable status/assignee guards |
| Final strict TS / candidate tests / live oracle | pass | pass | pass |
| SQL change touch surface | SQL, artifact, application, tests | SQL, static module, application, tests (+ emitted dist) | SQL/application/tests when behavior changes; no binding artifact |
| Required Ashiba command | generate + check | none | none |
| Semantic source-only drift | check fails before DB | stale static module remains runnable | changed canonical SQL is directly compiled |
| Parameter-shape source-only drift | check fails before DB | old binding hides new parameter | fresh binding rejects old call values before DB |

## Interpretation

Arm A's freshness proof is real and retained as evidence for the conditional
case where an application elects to commit static binding state. Arm B shows
that a static artifact can be reconstructed without Ashiba CLI, but lacks an
equivalent check. Neither proves that static state must be part of the default
architecture.

Arm C provides that missing ablation: the direct compiler/binder path achieves
the same final safety/behavior without a duplicate artifact. Compilation is
cached at controlled initialization, not repeated per query. Its startup
feasibility measurement is recorded in `COMPILE_OVERHEAD.md`.

## Change-exercise interpretation

The earlier matched optional-status change remains valid for A/B: A regenerated
deterministically while B manually synchronized its static module. The new
controls add a parameter-preserving semantic edit and a parameter-shape edit.
They prevent a misleading conclusion that every drift checker proves its own
generated surface necessary. See `ADDITIONAL_DRIFT_CONTROLS.md` for exact
states, limitations, and reproduction.

## Independent primitive safety

Every arm depends on the named primitive for lowering, value separation,
repeated-name ordering, and missing/unused rejection. The primitive does not
need a source hash or generated module. It catches parameter-shape mismatch
after the current canonical SQL has been compiled; it cannot discover a
parameter that a stale static module never represented.
