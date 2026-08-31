# Excluded AF-L-A-r2 setup attempt

This setup attempt is excluded from the scored AF-L-A-r2 cell.

The Fresh Agent modified the initial candidate after a candidate-local typecheck
failure without the parent runner first preserving the initial source snapshot
and command output. The frozen secondary protocol requires every attempt,
including a failed initial attempt, to be durable before a repair. Neither the
initial source nor its exact failure output can be reconstructed faithfully.

The available final candidate source is preserved in `final-candidate-source/`
for audit only. It is not a scored candidate, is not used for repair counts,
and has no runner result. The cell must be freshly materialized and rerun with
pre-repair snapshots.

The agent also reported a candidate-local `dist` write `EPERM`; no durable
command output was retained, so that observation is not classified as a cell
result. A fresh run must record it if it recurs.
