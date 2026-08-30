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

## Additional validation route

The review-requested Arm C was run as a separate clean-room lane under the
same Credit Aware Orchestration skill. Its finished append-only ledger is
committed as `additional-validation-orchestration-metrics.jsonl`; the ignored
live ledger remained under
`tmp/orchestration-metrics/model-gen-durable-ownership-additional-validation/metrics.jsonl`.

| Route | Model / effort | Purpose | Outcome |
| --- | --- | --- | --- |
| Luna worker | gpt-5.6-luna / high | independent Arm C no-artifact Fresh Agent application | completed after one bounded harness/schema repair; live nullable SQL then required escalation |
| Terra escalation | gpt-5.6-terra / high | SQL-only PostgreSQL nullable-guard repair after the permitted Luna retry | success; parent PostgreSQL oracle passed |

The first Luna oracle attempt identified a missing copied schema before
behavior checks. The one bounded retry corrected that harness omission. The
next oracle reached actual PostgreSQL behavior and surfaced SQLSTATE `42P08`
for untyped nullable guards; following the skill's retry rule, it escalated to
Terra rather than adding another Luna retry. The Terra correction changed only
visible SQL casts. There was one escalation, no Sol route, and no token or
credit telemetry; no estimate was created.
