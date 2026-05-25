# ConceptSpec Review Guide

Use this site to review Ashiba before implementation grows too far.

## Review Order

1. Start with the [Concept overview](../concepts/index.md).
2. Review the [ConceptSpec source](../concepts/ashiba-concepts.md).
3. Check the [Concept map](../concepts/concept-map.md) for relationships and status.
4. Compare product boundaries against the [Concept inventory](../concepts/ashiba-concept-inventory.md).
5. Use architecture pages for concrete naming and package boundary decisions.
6. Use migration pages to confirm what is implemented, deferred, or only planned.

## Review Questions

- Does Ashiba still mean a rebrand of `rawsql-ts/packages/ztd-cli`?
- Is `Ashiba Runtime Zero` consistently defined as `@ashiba/cli` generated application code with no Ashiba CLI/runtime library requirement, while still allowing database drivers, driver adapters, and extension runtimes?
- Is `Thin Driver Adapter` allowed without becoming an ORM?
- Does the CLI provide ORM-like development support through scaffolding, generated code, tests, drift checks, migration review, and query analysis instead of relation loading, lazy loading, unit-of-work tracking, or runtime entities?
- Are tests and drift detection treated as core safety mechanisms?
- Is type safety assigned to mapper tests and DB-backed integration tests instead of runtime result-row validation?
- Are mapper tests and performance tests assigned to the right lanes: ZTD for mapper tests, traditional DB-backed tests for performance?
- Is generated code treated as visible, editable repository code instead of hidden generator output?
- Is the generated-folder exception limited to DDL-derived unit-test schema files owned by Ashiba?
- Are errors available in human-oriented and AI-oriented modes with cause and next action where possible?
- Is hidden SQL rewriting prohibited for the `@ashiba/cli` Runtime Zero path, while driver adapters and SQL-first extensions keep their own explicit responsibility boundaries?
- Are future transforms documented as SQL-first, directly debuggable in a SQL client, and not query DSLs?
- Are named parameters required for source SQL maintainability, with DB driver wrappers owning placeholder conversion?
- Are planned features clearly separated from implemented behavior?

## Current Review Limits

- ConceptSpec format is provisional.
- `@ashiba/driver-adapter-core` and `@ashiba/driver-adapter-pg` have initial contracts and tests, but MySQL and SQL Server adapters are deferred.
- The CLI has a migrated command set for scaffolding, DDL review, query analysis, contract checks, model generation, performance evidence, RFBA inspection, and test evidence. Deeper semantic SQL validation and richer DB-derived type inference remain migration work.
- GitHub Pages base path is configured as `/ashiba/`.
