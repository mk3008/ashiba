# Codex orchestration adapter

For work requiring delegation, recovery, stale handling, or durable progress,
use the globally installed `$minimal-orchestration` skill. It is the authority
for Root, Worker, and Runtime Adjudicator roles, state transitions, task
packets, recovery, and generated progress views.

Keep Concept Specs, DFDs, Process Maps, and repository-specific impact routing
under Ashiba's local guidance. Before dispatch, create the run ledger at
`tmp/orchestration/<run-id>/ledger.json`, render after every state transition,
and retain worker reports as evidence. Do not duplicate global role protocol or
hand-edit generated progress views.
