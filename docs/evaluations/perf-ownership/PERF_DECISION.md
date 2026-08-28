# Perf Ownership Decision

## Decision

```text
REMOVE-WITH-MIGRATION-NOTE
```

## Exact reason

Performance measurement remains useful, but current Ashiba perf does not establish a performance fact. Execution, timing, plan capture, dataset definition, and candidate changes are application/native-tool work. Ashiba accepts caller-supplied duration and any existing explain path, does not bind evidence to SQL content or parameters, and compares arbitrary duration values without query/dataset/environment identity. Its only observed parameter mismatch rejection overlaps named-parameter core.

The remaining value is generation convenience, directory layout, report arithmetic, and policy prose. These are reconstructible with a small application-owned script or plain Markdown/JSON and do not justify permanent public commands, formats, compatibility, documentation, and test burden.

## Required migration shape

Removal should include a short migration note, not a compatibility shim: retain existing evidence as ordinary files, run canonical SQL through native driver tooling, capture `EXPLAIN ANALYZE` and timing in an application-owned artifact, and keep sandbox-only index experiments separate from adopted DDL.

| Factor | Observation |
|---|---|
| Unique durable value | None observed. |
| Reconstructible value | High with native `pg`/`psql`, EXPLAIN, and plain JSON/Markdown. |
| Overlapping core value | Missing/unused parameter validation. |
| Failure prevention | Existing-path validation only; no provenance/integrity protection. |
| Maintenance Surface | Five commands, formats, docs/help, compatibility, and future DBMS burden. |
| DBMS implication | A durable cross-DBMS contract would increase ownership without present proof. |
| Compatibility implication | Public removal merits a migration note; no current internal consumer was found. |
| Evidence strength | One real PostgreSQL task plus source and negative-control observation. |
| Uncertainty | No separate clean-room agent or external usage census. |

## Reconsideration trigger

Reconsider only after repeated real users need the same reproducible shared performance contract, native tools/agents repeatedly create materially wrong or incomparable evidence, or a small deterministic integrity guard proves independently necessary. Convenience, hypothetical runners, or generic interest in performance are not triggers.
