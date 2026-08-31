# Primary result aggregation and sqlc fidelity correction

## Status

This correction preserves immutable attempt evidence and regenerates only the
derived compact index and dependent descriptive transcriptions. It does not
rerun, overwrite, or delete any Fresh-Agent candidate.

## Terminal-live selection

The earlier extractor read `evidence/<cell>/runner.json` as `finalLive` even
when a later attempt had been finalized. That cell-root file is the initial
runner observation; it is not the terminal outcome after a repair.

The corrected extractor now selects the runner capture from the most recent
finalized attempt as `finalLive` and retains the former source separately as
`cellRootLive`. Eight primary cells changed only in this derived terminal
selection:

| Cell | Original cell-root live | Finalized terminal live |
| --- | --- | --- |
| G1-K-r1 | F | P |
| G1-P-r2 | F | P |
| G1-S-r1 | F | P |
| T1-A-r1 | F | P |
| T1-P-r1 | F | P |
| T1-S-r2 | F | P |
| T2-A-r2 | F | P |
| T2-S-r1 | F | P |

The descriptive primary terminal inventory is therefore 45 P / 3 F. By arm
it is A 7/8, P 8/8, D 8/8, K 8/8, G 7/8, and S 7/8 **before** the separate
sqlc-version eligibility screen below. First-live results are unchanged.

## sqlc frozen-version screen

The execution packet freezes sqlc 1.31.1 with `sqlc-gen-typescript` 0.1.3.
An audit of each primary sqlc candidate snapshot found six cells using the
0.1.2 WASM plugin:

- `G1-S-r1`
- `G1-S-r2`
- `Q1-S-r1`
- `T1-S-r2`
- `T2-S-r1`
- `T2-S-r2`

They remain preserved observations but are excluded from any claim that pools
the frozen 0.1.3 sqlc TypeScript treatment. The exact-version cells are
`T1-S-r1` (first/final P but frozen treatment review fail) and `Q1-S-r2`
(first F, final P, frozen treatment review pass). This is insufficient for an
arm-level sqlc comparison or an outcome claim about sqlc 0.1.3.

The benchmark consequently does not substitute a synthetic sqlc score or mix
0.1.2 and 0.1.3 as one treatment. A later dedicated remeasurement may produce
a full exact-version sqlc arm under a separately recorded correction protocol.

## Consequences

- Corrected terminal outcomes replace the former cell-root aggregation in all
  derived primary matrices.
- First-live outcomes and every immutable attempt remain unchanged.
- No primary arm is ranked.
- sqlc's primary arm is reported as **insufficient exact-version evidence**;
  its mixed-plugin records are not a score for the frozen 0.1.3 arm.
- Post-benchmark product interpretation remains separate from preregistered
  evidence and must use the corrected/qualified record.
