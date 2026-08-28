# Maintenance Surface

| Ownership | Value | Maintenance |
|---|---|---|
| Ashiba package | Isolates current implementation and tests | Private package/bin/version/help, generic API/options/example, rawsql-ts compatibility, docs-build coupling, package guidance and incomplete lint surface. |
| Transfer-local tool | Retains current deterministic checks and generated review pages | Transfer owns the source, local build setup, tests for retained behavior, and its own review vocabulary. |
| Plain scripts / AI | Can render or document one-off DDL work | Lower permanent surface, but does not preserve the current deterministic stale-reference and review-plan checks without rebuilding them. |

The evidence favors Transfer-local ownership. It reduces Ashiba product
Maintenance Surface without claiming the Transfer logic has no value.

## Rendering versus verification

Rendering Markdown/VitePress pages is generic convenience. Verification catches
real stale references, invalid metadata, missing order entries, and broken
relationships. The latter is valuable deterministic failure prevention, but it
currently validates the Transfer-specific metadata model, Concept/DFD/Process
graph, and review policies. It should move with Transfer rather than become an
Ashiba product guard.
