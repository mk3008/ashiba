# Result matrices

These matrices transcribe durable records. They are not rankings and do not
assign causal labels to additional attempts. `First B/T/Test` means the first
captured build/typecheck/test command slots. `First oracle/live` is the direct
alias of the first chronological attempt's captured runner result; it is not
reconstructed from those command slots. `Attempts (+)` is the retained attempt
count and records after the first attempt. `P` and `F` are runner-recorded
statuses, not a product-quality score.

## Primary per-cell matrix

| Cell | First B/T/Test | Final live | Frozen treatment fidelity | Attempts (+) |
| --- | --- | --- | --- | --- |
| G1-A-r1 | P/P/P | P | pass | 1 (+0) |
| G1-A-r2 | P/P/P | P | pass | 1 (+0) |
| G1-D-r1 | P/P/P | P | pass | 1 (+0) |
| G1-D-r2 | P/P/P | P | pass | 1 (+0) |
| G1-G-r1 | P/P/P | P | pass | 1 (+0) |
| G1-G-r2 | F/F/P | P | pass | 1 (+0) |
| G1-K-r1 | P/P/P | F | pass | 2 (+1) |
| G1-K-r2 | P/P/P | P | pass | 1 (+0) |
| G1-P-r1 | P/P/P | P | pass | 1 (+0) |
| G1-P-r2 | P/P/P | F | pass | 2 (+1) |
| G1-S-r1 | P/P/P | F | pass | 2 (+1) |
| G1-S-r2 | P/P/P | P | pass | 2 (+1) |
| Q1-A-r1 | P/P/P | F | pass | 3 (+2) |
| Q1-A-r2 | P/P/P | P | pass | 3 (+2) |
| Q1-D-r1 | P/P/F | P | pass | 1 (+0) |
| Q1-D-r2 | P/P/P | P | pass | 1 (+0) |
| Q1-G-r1 | P/P/P | P | pass | 1 (+0) |
| Q1-G-r2 | P/P/P | F | pass | 3 (+2) |
| Q1-K-r1 | P/P/P | P | pass | 2 (+1) |
| Q1-K-r2 | P/P/P | P | pass | 1 (+0) |
| Q1-P-r1 | P/P/F | P | pass | 1 (+0) |
| Q1-P-r2 | P/P/P | P | pass | 1 (+0) |
| Q1-S-r1 | P/P/F | F | pass | 3 (+2) |
| Q1-S-r2 | P/P/F | P | pass | 2 (+1) |
| T1-A-r1 | P/F/P | F | pass | 2 (+1) |
| T1-A-r2 | P/P/P | P | pass | 1 (+0) |
| T1-D-r1 | P/P/P | P | pass | 1 (+0) |
| T1-D-r2 | P/P/F | P | pass | 1 (+0) |
| T1-G-r1 | P/F/P | P | pass | 1 (+0) |
| T1-G-r2 | P/P/F | P | pass | 1 (+0) |
| T1-K-r1 | P/P/P | P | pass | 1 (+0) |
| T1-K-r2 | P/P/P | P | pass | 1 (+0) |
| T1-P-r1 | P/F/P | F | pass | 2 (+1) |
| T1-P-r2 | P/P/P | P | pass | 1 (+0) |
| T1-S-r1 | P/P/P | P | fail | 1 (+0) |
| T1-S-r2 | P/P/F | F | pass | 2 (+1) |
| T2-A-r1 | P/P/P | P | pass | 1 (+0) |
| T2-A-r2 | P/P/P | F | pass | 2 (+1) |
| T2-D-r1 | P/P/F | P | pass | 1 (+0) |
| T2-D-r2 | P/P/P | P | pass | 1 (+0) |
| T2-G-r1 | P/P/P | P | pass | 1 (+0) |
| T2-G-r2 | P/P/P | P | pass | 1 (+0) |
| T2-K-r1 | P/P/P | P | pass | 1 (+0) |
| T2-K-r2 | P/P/P | P | pass | 1 (+0) |
| T2-P-r1 | P/P/F | P | pass | 1 (+0) |
| T2-P-r2 | P/P/F | P | pass | 1 (+0) |
| T2-S-r1 | P/P/F | F | pass | 2 (+1) |
| T2-S-r2 | P/P/F | P | pass | 1 (+0) |

## Primary per-arm descriptive inventory

| Arm | Cells | First B/T/Test all P | First oracle P/F | Final live P/F | Frozen treatment pass | Frozen treatment fail | Retained attempts (+) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| A | 8 | 7 | 4 / 4 | 5 / 3 | 8 | 0 | 14 (+6) |
| P | 8 | 4 | 6 / 2 | 6 / 2 | 8 | 0 | 10 (+2) |
| S | 8 | 3 | 3 / 5 | 4 / 4 | 7 | 1 | 15 (+7) |
| D | 8 | 5 | 8 / 0 | 8 / 0 | 8 | 0 | 8 (+0) |
| K | 8 | 8 | 6 / 2 | 7 / 1 | 8 | 0 | 10 (+2) |
| G | 8 | 5 | 7 / 1 | 7 / 1 | 8 | 0 | 10 (+2) |

Across all primary cells, direct first oracle/live status is 34 P / 14 F;
terminal live status is 37 P / 11 F. The raw index preserves the per-cell
`firstLiveSource` hash/path and the terminal runner source. The difference is
an observation of retained attempt sequences, not an attribution of repair
cause or tool effect.

The Prisma `pass` column is the frozen review. Its separate final workflow
interpretation is in [PRISMA_TREATMENT_ADJUDICATION.md](./PRISMA_TREATMENT_ADJUDICATION.md): six cells are qualified-inline-contract and two are
emitted-contract-plus-raw-SQL. It must not be read as a full generated-client
workflow claim.

## Prisma three-field outcome summary

| Cell | Live behavior | Frozen treatment review | Final Prisma workflow interpretation |
| --- | --- | --- | --- |
| G1-P-r1 | P | pass | qualified-inline-contract |
| G1-P-r2 | F | pass | qualified-inline-contract |
| T1-P-r1 | F | pass | qualified-inline-contract |
| T1-P-r2 | P | pass | emitted-contract-plus-raw-SQL |
| T2-P-r1 | P | pass | qualified-inline-contract |
| T2-P-r2 | P | pass | emitted-contract-plus-raw-SQL |
| Q1-P-r1 | P | pass | qualified-inline-contract |
| Q1-P-r2 | P | pass | qualified-inline-contract |

This table transcribes the separate final adjudication; it does not alter the
historical live result, first-pass slots, or retained attempt count.

## Secondary control record coverage

| Control | First-pass field | Final/live field | Treatment-fidelity field | Attempt/repair field | Interpretation boundary |
| --- | --- | --- | --- | --- | --- |
| AF-V / AF-L r1 | not normalized | runner documents | runner/baseline record, not primary treatment review | heterogeneous evidence paths | descriptive architecture observation only |
| AF r2 | some nonstandard reliable paths; not normalized | supplemental AF runner records where preserved | runner/baseline record, not primary treatment review | heterogeneous; do not infer causes | report individual paths; no pooled score |
| X1 | not normalized | runner documents | treatment review where preserved | not normalized | non-aggregate composition control |
| SD | no first-pass document | durable `sd.json` status/detection stages | mutation/static-inspection record | one terminal schema document per record | fixture-specific drift stages only |
| E1 | no first-pass document | durable `e1*.json` nested G1 live result | `treatmentRemoval` record | one terminal schema document per record | bounded exit observation only |

For exact secondary paths, SHA-256 references and every raw observation are in
[raw-results.json](./raw-results.json) and [results.csv](./results.csv). The
aggregator records 13 nonstandard AF runner observations under
`supplementalObservations`; those paths are not silently discarded or renamed
into normalized primary repairs.

## X1 H-007 r2 terminal selection record

| Cell | Selected terminal runner | Recorded final/live status | Boundary |
| --- | --- | --- | --- |
| X1-A-r2 | `corrected-h007/runner-evidence/runner-repair1.json` | P | terminal-only, non-aggregate record |
| X1-P-r2 | `corrected-h007/runner-evidence/runner-initial.json` | F | terminal-only, non-aggregate record |
| X1-S-r2 | `corrected-h007/runner-evidence/runner-repair1.json` | P | terminal-only, non-aggregate record |
| X1-D-r2 | `corrected-h007/runner-evidence/runner-repair1.json` | P | terminal-only, non-aggregate record |
| X1-K-r2 | `corrected-h007/runner-evidence/runner.json` | P | terminal-only, non-aggregate record |
| X1-G-r2 | `corrected-h007/runner-evidence/runner.json` | P | terminal-only, non-aggregate record |

The selected file mapping is explicit in the aggregate script. It supersedes
r1 only for terminal X1 interpretation; r1 files remain retained correction
context. The r2 repair-path names are not a comparative repair metric. It is
not a directory-name heuristic and does not establish report-builder
suitability.
