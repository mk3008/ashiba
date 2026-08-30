# Publication self-review

## Completed document checks

- No overall numerical score or winner claim is made.
- Prisma 8 is called an RC/current-generation workflow, not GA/stable.
- sqlc TypeScript plugin status is not upgraded to core sqlc maturity.
- Primary outcomes are reported as runner observations, not causal tool claims.
- First-oracle/live status is derived only from each first attempt's captured
  runner result; it is reported separately from first command slots and final
  live status.
- Primary failures, pre-scoring corrections, and incomplete secondary controls
  are disclosed.
- Ashiba is not given an author-written detailed tutorial that other arms lack.
- Raw SQL escape hatches are treated as treatment-fidelity evidence, not
  silently accepted as an equivalent treatment.
- Architecture controls, X1, SD, and E1 are not added to the primary matrix.
- SD/E1 durable schema-v2 observations are reported without causal labels.
- AF replicate-two reliable/nonstandard paths are explicitly retained without
  inventing normalized causal labels.
- Prisma raw-SQL-dominant treatment fidelity has a separate final
  adjudication; it is not represented as a full generated-client lifecycle.
- X1 H-007 r2 terminal selection is explicit for all six arms; r1 remains
  preserved correction context rather than receiving inferred final status.
- X1 H-007 r3 evidence-preservation roots are explicitly excluded,
  non-comparable, and non-pooled; no r3 live/repair/fidelity result is claimed.
- Historical Ashiba results are not presented as Current Ashiba results.
- Historical per-cell Fresh-Agent dispatch, retry, escalation, and telemetry
  gaps are disclosed rather than inferred from candidate attempt records.

## Independent publication audit

The final independent Sol audit approved the publication evidence after
confirming the first-oracle derivation, the X1 terminal-only/excluded-r3
boundary, deterministic aggregation, the profile-required versus
dispatch-unverified wording, and the observed/inference boundary. The audit
does not replace repository verification, remote CI, or the orchestration
ledger finish.

## Completed final gates

- Repository verification passed: `pnpm typecheck`, `pnpm build`, `pnpm test`,
  `pnpm verify`, `pnpm docs:build`, and `git diff --check`.
- Final-head PR CI passed: `verify`, Node 22/npm 10 distribution, Node 24/npm
  11 distribution, and the Ticket Queue PostgreSQL reference.
- The append-only orchestration ledger is finished. Historical per-session
  telemetry remains unavailable and is not reconstructed.

Status: **done for human review**. This self-review records both required
review cycles; it does not convert unavailable historical telemetry into
measured data.
