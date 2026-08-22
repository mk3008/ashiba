# Timebox-controlled Fresh-Agent dispatch ledger

## Fixed controls

- Worker profile: `luna_worker` (`gpt-5.6-luna`, high effort).
- Permissions: inherited workspace-write session permissions.
- Timebox: 20 minutes from task dispatch per cell.
- Shared packet: `assignment-template.md` and `workload-spec.md`; G1 additionally receives the candidate rules, G2 additionally receives the current named guidance.
- Evaluator: v6, fixed before final scored evaluation; v5 outputs are calibration records because its W4 comment check required an unregistered English word.
- Isolation limitation: agents are directed not to inspect evaluator, results, or other candidate directories. The shared filesystem does not provide cryptographic enforcement.

## Cells

| Cell | Treatment | Dispatch UTC | Deadline UTC | Completion / interruption | Evaluator outcome |
| --- | --- | --- | --- | --- | --- |
| G0-r5 | G0 | 2026-08-22T08:51:09Z | 2026-08-22T09:11:09Z | completed before 2026-08-22T08:54:11Z | pass v6 2026-08-22T08:58:57Z |
| G0-r6 | G0 | 2026-08-22T08:51:09Z | 2026-08-22T09:11:09Z | completed 2026-08-22T08:53:48Z | pass v6 2026-08-22T08:58:57Z |
| G1-r5 | G1 | 2026-08-22T08:51:09Z | 2026-08-22T09:11:09Z | completed before 2026-08-22T08:54:11Z | pass v6 2026-08-22T08:58:57Z |
| G1-r6 | G1 | 2026-08-22T08:51:09Z | 2026-08-22T09:11:09Z | completed 2026-08-22T08:54:11Z | pass v6 2026-08-22T08:58:57Z |
| G2-r3 | G2 | 2026-08-22T08:54:36Z | 2026-08-22T09:14:36Z | completed 2026-08-22T08:57:22Z | pass v6 2026-08-22T08:58:57Z |
| G2-r4 | G2 | 2026-08-22T08:54:36Z | 2026-08-22T09:14:36Z | completed 2026-08-22T08:58:32Z | pass v6 2026-08-22T08:58:57Z |
