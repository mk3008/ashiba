# Credit Aware Orchestration record

The existing Credit Aware Orchestration skill was used. The append-only live
ledger was kept at
`tmp/orchestration-metrics/model-gen-durable-ownership-evaluation/metrics.jsonl`
under the skill's measurement rule, then copied verbatim after its finish event
as `orchestration-metrics.jsonl` for durable evaluation evidence.

| Route | Model / effort | Purpose | Outcome |
| --- | --- | --- | --- |
| Luna scout | gpt-5.6-luna / medium | read-only history, consumer, and generated-field census | success |
| Luna worker | gpt-5.6-luna / high | Arm A current-workflow maintenance exercise | success after one bounded SQL-type repair |
| Luna worker | gpt-5.6-luna / high | Arm B primitive-only fresh application and its maintenance exercise | success after one bounded SQL-type repair |

There were three initial delegations, three follow-up task messages, two
bounded retries, and no Terra/Sol escalation. Token and credit telemetry were
unavailable; no estimates were created. Parent-run PostgreSQL oracle failures
were used only to classify the bounded repairs.

The final ledger finish event is recorded after repository verification.
