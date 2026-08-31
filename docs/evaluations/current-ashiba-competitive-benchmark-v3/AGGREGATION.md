# Result aggregation

`fixtures/aggregate-results.mjs` rebuilds the compact `raw-results.json` and
`results.csv` indexes from the committed evidence trees. It is a read-only
extractor: it does not run candidates, contact PostgreSQL, change a runner, or
score a tool.

Run it from a repository clone after the evidence is available:

```text
node docs/evaluations/current-ashiba-competitive-benchmark-v3/fixtures/aggregate-results.mjs \
  --root docs/evaluations/current-ashiba-competitive-benchmark-v3
```

The command writes the two files at the benchmark root. To write a temporary
copy instead, pass `--json <path>` and `--csv <path>`.

## Input boundary

Primary inputs are each cell's `evidence/<cell>/runner.json` plus every
immutable `evidence/<cell>/attempts/<attempt-id>/` record. Secondary inputs
are every `secondary-evidence/<cell>/**/runner.json` observation, durable E1
documents matching `e1*.json` (such as `e1.json` and `e1-repair1.json`), and
durable SD `sd.json` documents. The E1 matcher excludes runner snapshots such
as `e1.primary-g1.json`. The script records a SHA-256 for each referenced JSON
input in the compact index.

X1 additionally has an explicit audited H-007 r2 terminal-runner map for all
six arms. It selects a named corrected runner document and retains the
selection in `selectedFinalObservation`; it does not derive a terminal outcome
from a directory layout. Pre-correction r1 documents remain retained but are
not selected as terminal X1 interpretations.

The source runner outputs and attempt folders remain authoritative. The index
is intentionally compact: it preserves first-pass slots, every captured live
result, treatment review, finalization record, durable E1/SD schema summary,
and evidence path without copying large event streams a second time. Every
cell also emits `evidenceCounts` for first-pass, live, final, treatment, and
attempt source records; these are inventories rather than verdicts. For each
primary cell, `firstLive` is the first chronological attempt's captured runner
result. `finalLive` is the captured runner result from the most recent
finalized attempt (falling back to the final chronological attempt only if no
finalization record exists). The original cell-root `runner.json` remains
preserved as `cellRootLive`; it is an initial observation, not a terminal
verdict after a repair attempt. This makes first-oracle and final-live status
visibly separate without deriving either from build/typecheck/test slots.

## Interpretation boundary

The generated files do **not** compute an aggregate score, ranking, winner,
tool-quality conclusion, or causal interpretation. They leave absent fields as
absent/null. In particular, an additional recorded attempt is not assigned a
causal category. File and directory names are retained as evidence paths only;
they do not determine an outcome or causal interpretation.

`results.csv` is a convenience table with one primary row per cell and one
secondary row per standard runner observation, durable schema document, or
explicit nonstandard AF runner record. Selected X1 H-007 r2 terminal records
are additional convenience rows, not replacements for original r1
observations. It should be read with
`raw-results.json` and the linked immutable evidence, not as an independent
benchmark result.

Reliable AF roots are identified by their explicit `-reliable` suffix and are
grouped under the canonical cell. The extractor also retains AF runner-shaped
documents in an exact cell root as `supplementalObservations`; it records the
path and runner summary but does not convert heterogeneous preservation layout
into a repair or treatment category.

See [RAW_RESULTS_SCHEMA.md](./RAW_RESULTS_SCHEMA.md) for fields and current
coverage limits.

## Excluded correction roots

`X1-<arm>-r3` roots are intentionally excluded from canonical secondary cells.
They preserve a non-comparable H-007 evidence-preservation remeasurement, not
a candidate result. The index lists their roots and the two summary hashes in
`excludedCorrections`; it does not turn their static/typecheck/environment
observations into live outcomes, repair counts, or fidelity records.
