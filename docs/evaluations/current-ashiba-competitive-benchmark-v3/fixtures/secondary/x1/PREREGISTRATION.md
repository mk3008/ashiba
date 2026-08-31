# X1 preregistration

Control ID: `X1`; protocol: `secondary-controls-v1`; status: non-aggregate.

Run one independent Fresh-Agent replicate for each primary arm. Use the same
model profile, Node 24, PostgreSQL 18, isolation boundary, and repair cap
(initial implementation plus two candidate repairs) as the primary packet.
Speed is an observation only, not a score.

The candidate must export `createReportApplication(runtime)` and implement the
frozen `runReport` contract in `RUNNER_API.md` with its arm's normal
data-access treatment. The request vocabulary is deliberately closed and
runner-validated; a candidate must reject unknown dimensions, metrics, status
values, and malformed tag values with `code: 'VALIDATION'`. This control
measures the treatment's response to a report-shaped composition task, not a
claim that every arm should support arbitrary runtime SQL.

Pass requires all runner-owned requests and negative controls to pass,
treatment review to confirm the arm's main path, source/executed SQL evidence,
pre-cleanup database state, cleanup, and an unchanged source manifest during
runner execution. A behaviour pass and treatment-fidelity pass are recorded
separately. A failed candidate is evidence, not an exclusion.
