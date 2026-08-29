# Clean-room dogfooding

Two separate fresh-agent clean rooms received only packed Ashiba packages,
ordinary dependencies, frozen DDL/business acceptance, a consumer AGENTS.md,
and an architecture prompt. They did not receive Ashiba source, existing
examples, evaluations, or another candidate's output.

The VSA and layered candidates both produced visible SQL, generated metadata,
named binding, finite reviewed sort choices, native `pg`, and a transaction
with audit rollback. A runner-owned PostgreSQL oracle separately checks
installation-independent behavior: filtering, sorting, pagination, get,
committed assignment, and rollback after an injected audit failure.

The first VSA candidate used the wrong `pg` call shape. The runner-owned oracle
caught it before reference adoption. A bounded escalation repaired that call
shape; the next unchanged oracle exposed PostgreSQL's ambiguous nullable guard
without a canonical SQL type cast. A second clean-room escalation added typed
guards and regenerated the artifacts. Layered needed the same typed nullable
guards. The final unchanged oracle passes for both candidates. This is evidence
for the release gate, not a hidden first-try success claim.
Token and credit telemetry were unavailable; the orchestration ledger records
the model lanes, purpose, retry/escalation, and outcome without inferred usage.
