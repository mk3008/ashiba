# Optional CLI Analysis Surface Durable Ownership Evaluation

This evaluation records the ownership decision for Ashiba's optional SQL
formatting, linting, inspection, and reporting commands. It does not change
the product implementation.

## Decision

**Overall: REDUCE.** Retain `query uses` as a narrow, AST-first,
fail-closed optional impact-inspection capability. Retain only the
DDL-backed deterministic checks currently reached by `ashiba lint`. Remove
the optional formatter, advisory query lint, outline, graph, and slice
capabilities in a follow-up implementation.

The current Golden Path remains unchanged:

```text
canonical SQL
→ deterministic binding metadata
→ bindNamedParameters
→ native driver
→ optional PostgreSQL contract
→ application/live tests
```

## Documents

- [Current surface inventory](CURRENT_CLI_SURFACE_INVENTORY.md)
- [Consumer census](CURRENT_CONSUMER_CENSUS.md)
- [Dependency graph](DEPENDENCY_GRAPH.md)
- [Capability ownership ledger](CAPABILITY_OWNERSHIP_LEDGER.md)
- [Failure prevention versus convenience](FAILURE_PREVENTION_VS_CONVENIENCE.md)
- [AI reconstructibility](AI_RECONSTRUCTIBILITY.md)
- [Maintenance surface](MAINTENANCE_SURFACE.md)
- [Formatter decision](FORMATTER_DECISION.md)
- [Lint decision](LINT_DECISION.md)
- [Query-analysis decisions](QUERY_ANALYSIS_DECISIONS.md)
- [Final decision](OPTIONAL_CLI_ANALYSIS_DECISION.md)
- [Machine-readable results](raw-results.json)

`evaluation/fixtures/` contains the small reproducible fixtures used for the
focused positive and negative controls. No database, credentials, or
application source was changed.
