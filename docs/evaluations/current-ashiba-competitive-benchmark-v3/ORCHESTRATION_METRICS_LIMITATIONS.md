# Orchestration Metrics Limitations

## Scope

The Credit Aware Orchestration ledger is append-only at
`tmp/orchestration-metrics/current-ashiba-competitive-benchmark-v3/metrics.jsonl`.
It records the routes that were durably captured while the benchmark was being
prepared and finalized.

## Historical capture gap

The 48 scored primary cells and several secondary-control runs preserve their
candidate sources, packets, runner results, repair sequence, and cleanup
records. Their individual candidate manifests do **not** preserve the Codex
dispatch session id, dispatch start/end timestamp, per-dispatch route, or
runtime token/credit telemetry. Those fields cannot be reconstructed
faithfully after the fact.

`EXECUTION_PROFILE.md` does freeze the intended primary profile as one new
`gpt-5.6-terra` high-effort Fresh-Agent session per cell. Where the ledger
summarizes that batch, it labels the model and effort as **profile-derived**,
not dispatch-confirmed. Candidate repairs are distinct from orchestration
retries and are never converted into a retry count.

## What is and is not claimed

- The candidate outcome, repair sequence, isolation, runner result, and
  cleanup come from the retained cell evidence.
- Token and credit telemetry are `unavailable`; no estimates are recorded.
- Exact historical per-session start/end times, session ids, retry indices,
  and escalation routes are `unavailable` unless an original ledger event
  exists.
- Finalization-era routes are recorded at the time they occur. This cannot
  retroactively improve the earlier capture gap.

## Consequence

The ledger is sufficient to disclose the routing policy and the available
telemetry without fabricating it, but it is not a complete per-dispatch
telemetry export for historical scored cells. This is a durable evidence
limitation of the benchmark and a follow-up process requirement for any
future benchmark.
