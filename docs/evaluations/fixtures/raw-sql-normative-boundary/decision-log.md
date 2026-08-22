# Adaptive decision log

## 2026-08-22 — initial registration

- Observed problem: current product names are being mistaken for requirements because no compact independent contract is recorded.
- Original assumption: the seven initial candidate rules can be assessed through G0/G1/G2 and W1–W4 without adding a SQL-guidelines arm.
- Why it holds at registration: no treatment result exists.
- Protocol change: none.
- Previous runs valid: not applicable.
- Calibration/invalid runs: none.
- Effect on comparability: baseline fixed before dispatch.

Future entries must be written before changing a condition and must state the observed problem, original assumption, why it no longer holds, protocol change, previous-run validity, calibration/invalid status, and comparability effect.

## 2026-08-22 — candidate submission boundary was under-specified

- Observed problem: the first four submissions used incompatible exported shapes and return conventions despite all attempting the workloads. The runner could not distinguish a workload defect from a submission-protocol mismatch. Its initial source heuristic also classified ordinary non-SQL JavaScript concatenation as SQL construction.
- Original assumption: the prose `{ sql, params, execute(client, input) }` description sufficiently froze the callable boundary and a broad interpolation/concatenation scan would be a useful safety signal.
- Why that assumption no longer holds: G0-r1, G0-r2, G1-r1, and G1-r2 produced non-comparable evaluator failures dominated by the boundary ambiguity. The evidence cannot support a treatment inference.
- Protocol change: add a copyable interface skeleton, require all `execute` functions to resolve to rows, require `queries.<workload>.sql` to remain named canonical SQL even when W2 chooses among separate assets, use typed casts in the frozen W1 reference shape, and replace the broad source regex with a review-recorded inspection of SQL-producing expressions.
- Previous runs valid: they remain durable calibration observations about assignment ambiguity only.
- Calibration/invalid runs: G0-r1, G0-r2, G1-r1, and G1-r2 are excluded from scored treatment totals and retained under `evidence/calibration/`.
- Effect on comparability: no scored G0/G1/G2 comparison exists before this change. All scored guidance cells will use the revised packet and evaluator version.

## 2026-08-22 — W4 oracle asserted an unregistered result shape

- Observed problem: the revised G0/G1 submissions correctly supplied named canonical SQL, finite sort rejection, and lexical edge cases, but the evaluator incorrectly required W4 to project a `literal` column and seeded no row for its registered `note: 'x'` input. The packet required lexical correctness, not that output shape.
- Original assumption: a fixed projection was implicit in the W4 wording and the data fixture made the binding assertion executable.
- Why that assumption no longer holds: inspection of the submissions shows compatible W4 query boundaries returning item rows; the runner's required projection was an unannounced extra contract, so the failure could not be interpreted as a treatment outcome.
- Protocol change: accept a string or finite manifest of named canonical SQL assets, validate each named asset, seed the W4 matching row, assert returned `note`/`status`, and inspect the canonical asset for preservation of quoted/comment pseudo-parameters. Continue to record only the narrowly targeted direct-driver source heuristic.
- Previous runs valid: the generated JSON records remain a calibration trace of the evaluator defect; the candidate artifacts and packet remain valid and will be re-evaluated without editing candidates.
- Calibration/invalid runs: the first post-revision executions of G0-r4, G1-r3, and G1-r4 are calibration executions, not scored outcomes.
- Effect on comparability: the treatment packets are unchanged; every scored cell will use evaluator v3. No cross-version tally will be reported.

## 2026-08-22 — named-parameter assertion applied to parameterless SQL

- Observed problem: evaluator v3 required every canonical asset to contain a named parameter, falsely failing the parameterless `openItems` source and finite W2 SQL assets selected without SQL values.
- Original assumption: named parameters are a universal lexical property of every source asset.
- Why that assumption no longer holds: the candidate rule concerns runtime values. Parameterless complete SQL has no runtime value to name, and requiring a synthetic parameter would reduce clarity.
- Protocol change: require named parameter syntax only for W1, W2 CASE-value form, W3 `ownedItems`, and W4; permit parameterless complete SQL for `openItems` and finite W2 asset maps.
- Previous runs valid: prior v3 JSON is evaluator calibration only; no scored interpretation is made from it.
- Calibration/invalid runs: G0-r3, G0-r4, G1-r3, and G1-r4 v3 executions are superseded by v4 re-evaluation of unchanged artifacts.
- Effect on comparability: no candidate changes; all scored treatment cells use evaluator v4.

## 2026-08-22 — finite SQL manifest traversal was too shallow

- Observed problem: evaluator v4 accepted a one-level W2 asset map but rejected the G2 complete-SQL manifest grouped by sort key then direction, even though it executed safely and all behavioral checks passed.
- Original assumption: finite assets would be represented as a flat map.
- Why that assumption no longer holds: the assignment permits separate complete SQL assets without imposing their nesting shape; both flat and grouped maps preserve the reviewable finite set.
- Protocol change: recursively collect string leaves from a finite manifest for source-asset inspection. The evaluator continues to reject absent or non-string leaves.
- Previous runs valid: all v4 result files are calibration records only.
- Calibration/invalid runs: G0-r3, G0-r4, G1-r3, G1-r4, and G2-r1 v4 executions are superseded by v5 re-evaluation of their unchanged artifacts.
- Effect on comparability: final scored results use evaluator v5 for every cell.

## 2026-08-22 — Fresh-Agent timebox was not enforced or recorded

- Observed problem: the six evaluator-v5 candidate artifacts have a common worker role and packet, but their dispatch records did not contain an enforced shared wall-clock deadline. Calling them a same-timebox matrix would overstate the protocol.
- Original assumption: common worker profile and prompt isolation were sufficient to describe a small guidance experiment.
- Why that assumption no longer holds: the registered protocol explicitly requires the same timebox as well as the same profile and permissions.
- Protocol change: retain v5 and the workload packet unchanged; dispatch two new Fresh-Agent cells per treatment with a recorded 20-minute deadline from dispatch. Completion after the deadline is interrupted and recorded as unevaluable. The coordinator records dispatch/deadline/outcome in `evidence/dispatch-ledger.md`.
- Previous runs valid: G0-r3/r4, G1-r3/r4, and G2-r1/r2 remain exploratory runner-owned construction observations and support evaluator validation.
- Calibration/invalid runs: those six cells are not included in the timebox-controlled treatment tally; no claim about relative guidance effect uses them.
- Effect on comparability: the replacement scored matrix is a new sub-experiment. It is not pooled with earlier cells.

## 2026-08-22 — W4 comment assertion required an unregistered word

- Observed problem: evaluator v5 required the literal word `comment` before the pseudo-parameter in W4 source. The workload requires a pseudo-parameter inside a SQL comment, not that English word. Both G1 cells used valid line/block comments and passed every functional check, yet failed this unregistered lexical assertion.
- Original assumption: the example comment text could serve as the oracle shape.
- Why that assumption no longer holds: requiring the example prose is unrelated to correct lexical lowering and biases implementation style.
- Protocol change: evaluator v6 accepts either a line or block SQL comment containing `:not_a_parameter`, while retaining the quoted-literal and executed-result checks. Timebox-controlled candidate artifacts are unchanged and are re-evaluated uniformly.
- Previous runs valid: v5 records remain calibration evidence of the oracle defect; candidate source and timebox ledger remain valid.
- Calibration/invalid runs: all v5 timebox-controlled evaluator outputs are superseded by v6 outputs; no v5 tally is used.
- Effect on comparability: only evaluator assertion normalization changes. The same six timeboxed artifacts are evaluated by v6.
