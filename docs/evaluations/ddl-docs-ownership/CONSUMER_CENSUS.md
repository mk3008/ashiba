# Consumer Census

## Current consumers and integration

| Consumer | Classification | Use |
|---|---|---|
| `scripts/generate-transfer-docs.mjs` | Transfer product consumer | Calls `concept-site`, `structured-concept build`, `check`, `review-plan`, and `generate` with Transfer paths and policies. |
| `package.json` `docs:transfer` | Temporary repository integration | Builds the private tooling and runs Transfer generation. |
| `package.json` `docs:build -> docs:transfer` | Temporary repository integration | Couples the root docs build to the experimental Transfer workflow. |
| `package.json` `verify:transfer-ddl-metadata` / `verify:transfer-docs` | Temporary repository integration | Runs Transfer-specific metadata and generated-doc verification from the root workspace. |
| Package tests and minimal example | Tooling-local | Preserve the current private tool behavior, not a separate Ashiba product consumer. |

**Ashiba product consumer count: 0.**

No current Ashiba product package or current Ashiba CLI imports the package. The
package is private, so no external adoption census is required. Repository
integration is not an Ashiba product consumer.

## Root repository coupling

The root currently contains `docs:transfer`, `docs:build -> docs:transfer`,
`verify:transfer-ddl-metadata`, `verify:transfer-docs`, and
`scripts/generate-transfer-docs.mjs`. These are real repository maintenance and
integration surfaces, but their existence means only that Transfer is
**temporarily integrated in this monorepo**. It does not make Transfer or
`ddl-docs-cli` part of the current Ashiba product family.

A later implementation may separate the Ashiba default product workflow from
this experimental Transfer workflow. That implementation is outside this
evaluation.

## Dependency direction

`Transfer -> Ashiba packages` is allowed. `Ashiba product -> Transfer-specific
product/tooling` is not intended. Logical detachment targets zero Transfer or
`ddl-docs-cli` requirements in Ashiba core/product build, docs, and verification,
without requiring a physical move in this task.
