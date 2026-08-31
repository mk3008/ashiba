# SD preregistration

Control ID: `SD`; protocol: `secondary-controls-v1`; status: non-aggregate.

Select one final-live, strict-treatment G1 candidate per arm under the
selection rule in `secondary-protocol/PREREGISTRATION.md`. The selected
snapshot is immutable evidence; its copied SD candidate is the only candidate
visible to the run. Run three independent nonce-schema mutations:

1. `tickets.title` rename to `subject`;
2. compatible `tickets.assignee` nullability tighten; and
3. `tickets.priority` integer to bigint.

The source, lockfile, generated state, candidate tests, and dependency
resolution are unchanged by the runner. Optional predeclared commands are
executed in order: typecheck, treatment command, candidate test. The runner
then invokes the candidate's G1 `get` and `list` against the altered schema.
The first failing stage is recorded; no detection in those stages is a valid
result. The candidate has no repair turn because SD measures an unchanged
application. Any candidate-source hash change is a protocol failure.
