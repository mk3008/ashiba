# Benchmark continuation state — 2026-08-30

## Pause reason

The requester asked for a deliberate pause. This is not a human product-decision
blocker. The benchmark remains incomplete and must not be presented as a result,
ranked partially, or submitted as a pull request.

## Immutable work preserved before the pause

- The 48 primary scored cells and their candidate/evidence snapshots are already
  committed.
- Secondary X1, SD, and E1 evidence is committed. The aggregate is schema v2 at
  the current branch head.
- AF-V/AF-L replicate 1 is committed.
- AF replicate 2 is preregistered and materialized but incomplete. No new r2
  cell was completed during the final pause request.

## AF replicate 2 exact state

All 12 r2 external candidate directories were materialized with isolated npm
caches. Only `AF-V-A-r2` began execution.

- `AF-V-A-r2` initial attempt: final `F`; candidate-local TypeScript errors
  prevented `dist/application.js` from being emitted (`Pool` versus `PoolClient`
  and binding-map typing). The runner cleanup passed.
- Repair 1 was started and interrupted before an oracle invocation. It has no
  candidate repair output and must be treated as an interrupted attempt, not a
  completed repair.
- Preserved, uncommitted paths:
  - `secondary-candidate-snapshots/AF-V-A-r2/attempt-initial/`
  - `secondary-candidate-snapshots/AF-V-A-r2/attempt-repair1-interrupted/`
  - `secondary-evidence/AF-V-A-r2/attempt-initial/`

On resumption, first commit these preserved paths. Then continue AF r2 only
under the frozen secondary protocol: fresh candidate session/directory per
cell, separate nonce schema/role/evidence directory, shared packet and runner
read-only, and the bounded repair cap. Do not reuse candidate source or repair
knowledge across cells.

## Mandatory remaining benchmark work

1. Complete all 12 AF r2 cells; retain the interrupted A attempt and follow the
   preregistered repair/exclusion rules.
2. Address publication-audit findings without changing historical primary
   results:
   - provide a final-head reproduction path that verifies the frozen primary
     packet at its freeze commit (`7988e3bedb84ee918c928afa33a58dbbcf826a37`)
     rather than silently rewriting its hash for the mutable correction ledger;
   - preserve and correct the SD-A static-isolation false failure, then rerun
     only the affected SD-A cell under a documented correction;
   - independently adjudicate the Prisma treatment-fidelity evidence, especially
     raw-SQL-only candidates, separately from live behavior;
   - publish complete first-pass, final-live, treatment-fidelity, and repair
     matrices from the durable raw evidence.
3. Refresh the aggregate, publication reports, self-review, and correction
   ledger after the evidence is complete; request a follow-up independent
   publication audit.
4. Run the repository verification suite, finish the Credit Aware Orchestration
   metrics ledger, push the completed branch, create one PR, and confirm its
   remote CI. Do not create a PR before the full protocol is complete.

## Current known audit status

The independent publication audit found evidence/protocol tasks only. It did
not identify a human product-owner decision. In particular, no product code or
public API change is authorized or needed for the remaining work.

## Working-tree note

At the pause, report-synthesis edits may be present but are not final
publication conclusions. Preserve them in the pause commit; reconcile them
against the raw aggregate only after the remaining cells and corrections are
complete.

## Orchestration / telemetry

The task is using the existing Credit Aware Orchestration Skill. The metrics
ledger is active at
`tmp/orchestration-metrics/current-ashiba-competitive-benchmark-v3/metrics.jsonl`.
Token and credit telemetry remain `unavailable`; do not infer values on resume.

