# Final AI-First Clean-Room Release Validation

## Decision

**RELEASE-READY.** Two independent tarball-only Fresh Agent arms built and changed a safe raw-SQL PostgreSQL application without an Ashiba CLI, generated binding artifact, source freshness workflow, or Ashiba application framework. They used the current direct path:

```text
visible canonical SQL
  -> compileNamedParameters
  -> bindNamedParameters
  -> native pg
  -> application/live tests
```

The runner-owned PostgreSQL oracle passed both arms. It verified filters, all original finite sorts, stable ordering, pagination, get, assignment/audit commit, rollback on injected failure, hostile values, missing names, unused names, and arbitrary-sort rejection.

## What this validates

- The public distribution needed by each candidate was one packed package: `@ashiba-ts/named-parameters`.
- VSA and ordinary Layered organization required no architecture-specific Ashiba support.
- Controlled compile/cache occurred at a module boundary in both candidates; neither compiled on every query execution.
- The VSA maintenance request remained a local visible-SQL/application change and introduced no generated duplicate state.
- Current documentation, package guidance, consumer AGENTS sample, product-purpose distinction, hero image, and tagline all match the successful operating model.

## Limits

This is a bounded PostgreSQL ticket task, not proof that every SQL dialect or domain has the same ergonomics. Token and credit telemetry were unavailable. The optional architecture-unspecified third arm was not run because VSA and Layered satisfy the required independent architecture gate.

## Evidence map

- [Input boundary](./INPUT_BOUNDARY.md)
- [VSA result](./VSA_FRESH_AGENT.md)
- [Layered result](./LAYERED_FRESH_AGENT.md)
- [Maintenance exercise](./MAINTENANCE_EXERCISE.md)
- [Safety controls](./SAFETY_CONTROLS.md)
- [Education cost](./EDUCATION_COST.md)
- [Architecture neutrality](./ARCHITECTURE_NEUTRALITY.md)
- [Documentation validation](./DOCS_VALIDATION.md)
- [Release decision](./RELEASE_DECISION.md)
