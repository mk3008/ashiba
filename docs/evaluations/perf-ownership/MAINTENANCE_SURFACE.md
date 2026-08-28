# Maintenance Surface

## Ownership if perf remains

- Five public CLI commands and help/catalog discoverability.
- Option/result interfaces and 631 LOC of command implementation.
- Incompatible JSON shapes for scenario measurement and report input.
- Directory/filename conventions for sandbox, scenarios, candidates, and evidence.
- README/index-policy wording and future accuracy.
- Failure behavior for paths, duration input, report fields, and format migrations.
- Compatibility expectations for committed scenario/evidence artifacts.
- Documentation and test burden across PostgreSQL primary and secondary DBMS positioning, even though perf executes no DBMS itself.

## Durable-value assessment

The surface owns policy prose and caller-supplied records, not a mechanically established performance fact. It does not prevent stale SQL, fabricated duration, unrelated plans, mismatched datasets, or mismatched query identity. Parameter validation overlaps core binding.

Keeping perf commits Ashiba to format and command evolution without a corresponding unique guard. A project that needs a shared performance contract can own a small report beside its query and benchmark runner; dataset/environment policy is application-specific.

## Removal burden

The public command requires a concise migration note. No current repository consumer, CI lane, or generated application artifact was found. Existing evidence can remain ordinary JSON/Markdown without data conversion.
