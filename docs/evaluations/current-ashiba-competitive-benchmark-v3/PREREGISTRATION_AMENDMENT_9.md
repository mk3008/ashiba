# Preregistration amendment 9: parallel primary-cell execution

## Status at correction

Primary scored-cell count is **0**. A pre-freeze G1-A-r1 exploratory dispatch
was interrupted before scoring and is excluded calibration only; it must not be
used in results, comparisons, or repair counts.

## Fixed execution method

The primary matrix is executed in deterministic workload/replicate blocks from
`fixtures/packet/execution-order.json`. Within one workload/replicate block,
up to four distinct arms may run concurrently. Each cell receives:

- a new Fresh Agent session with no prior-cell history;
- a new external candidate directory and copied packet;
- an independent `node_modules` directory and npm cache;
- an independent evidence directory;
- a runner-owned nonce PostgreSQL schema and least-privilege role.

The shared packet, runner, oracle, and artifact source are read-only during
scored execution. Candidate source, repair feedback, outputs, runner records,
and database summaries are never provided to another cell. Parallelism is a
throughput method only: no wall-time result is used as a comparison metric.

## Conflict and correction handling

If a shared runner, packet, oracle, or materializer defect is found, all cells
that used that version are affected and must be invalidated/rerun according to
the correction rule. Candidate-local install or environment failures remain
cell-local and are recorded separately. Candidate cleanup occurs only after
evidence finalization.

## Binding freeze

The first commit containing this amendment and a passing v2 packet verifier is
the sole `executionPacketFreezeSha` for all primary scored cells. It supersedes
the amendment-8 proposal before any scored dispatch.
