# Decision log

## 2026-08-22 — registration

- Observed problem: PR #62 did not test a whole application, three-state
  optional inputs, application-defined CASE ordering, or brownfield change.
- Original assumption: those gaps can be evaluated with one small work-item
  domain, a `pg` application-owned runtime, and a live PostgreSQL runner.
- Reason for change: not applicable; no results existed.
- Protocol / requirement change: none.
- Previous run validity: not applicable.
- Calibration / invalid status: none.
- Effect on comparability: baseline fixed before reference E2E and dispatch.

## 2026-08-22 — dispatch path calibration

- Observed problem: the first Fresh-Agent cell received a repository-relative
  allocation path, but its isolated current workspace was the repository root,
  not this new worktree. It could not locate the allocated files.
- Original assumption: a repository-relative allocation path would resolve from
  every worker's current workspace.
- Reason for change: the worker's direct observation disproved that assumption.
- Protocol / requirement change: give all remaining cells their absolute
  allocation and assignment paths; re-trigger the first cell with the same task.
- Previous run validity: no candidate files were changed, so no scored run is
  invalidated.
- Calibration / invalid status: the initial path lookup is a dispatch
  calibration event, not a task attempt or evaluation result.
- Effect on comparability: all actual implementation attempts receive the same
  substantive task, profile, permissions, and deadline.

## 2026-08-22 — brownfield oracle coverage calibration

- Observed problem: the first executable brownfield oracle checked each target
  change but did not apply hostile value and computed-order checks to every
  cell, which would leave the cross-task minimum evidence uneven.
- Original assumption: target-specific assertions plus the greenfield result
  were sufficient for every brownfield cell.
- Reason for change: the registered protocol requires those checks independently
  for every run, not by inference from another run.
- Protocol / requirement change: add common hostile-parameter, finite simple
  ordering, computed-ordering, and final-state assertions; rerun all unchanged
  candidate allocations with the same runner version.
- Previous run validity: the earlier executions are calibration only and are
  not included in `brownfield-results.json`.
- Calibration / invalid status: all six pre-expansion evaluations are
  superseded; no implementation artifact was edited for this calibration.
- Effect on comparability: all six reported results use the same expanded
  oracle and remain comparable.
