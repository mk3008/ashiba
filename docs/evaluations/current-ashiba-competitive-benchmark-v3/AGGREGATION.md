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
are every `secondary-evidence/<cell>/**/runner.json` observation. The script
records a SHA-256 for each referenced JSON input in the compact index.

The source runner outputs and attempt folders remain authoritative. The index
is intentionally compact: it preserves first-pass slots, every captured live
result, treatment review, finalization record, and evidence path without
copying large event streams a second time.

## Interpretation boundary

The generated files do **not** compute an aggregate score, ranking, winner,
tool-quality conclusion, or causal interpretation. They leave absent fields as
absent/null. In particular, an additional recorded attempt is not labelled a
repair category unless a source evidence schema explicitly supplies one.

`results.csv` is a convenience table with one primary row per cell and one
secondary row per runner observation. It should be read with `raw-results.json`
and the linked immutable evidence, not as an independent benchmark result.

See [RAW_RESULTS_SCHEMA.md](./RAW_RESULTS_SCHEMA.md) for fields and current
coverage limits.
