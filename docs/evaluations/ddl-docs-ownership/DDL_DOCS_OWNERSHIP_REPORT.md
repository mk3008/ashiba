# DDL Docs Durable Ownership Evaluation

## Question

This evaluation asks whether `@ashiba-ts/ddl-docs-cli` should remain an Ashiba
product/package responsibility or should be owned as Transfer-local dogfooding
tooling. It does not ask whether deriving documentation or checks from DDL is
useful.

## Decision

**REHOME-TO-TRANSFER**

The package has one current product consumer: the Transfer dogfood generation
and review harness. Its useful mechanical checks are real, but their metadata
model and review rules are Transfer-specific. No current non-Transfer Ashiba
consumer or stable public package contract was found.

## Evidence

- The package is private and describes itself as an internal dogfooding CLI.
- Root `docs:build` invokes `docs:transfer`, which builds the package and runs
  `scripts/generate-transfer-docs.mjs`.
- That script supplies Transfer DDL, table docs, relationships, Concept/DFD/
  Process files, Scope, testing, authority, technology policy, and review-plan
  inputs to the CLI.
- A throwaway Transfer-local copy built and ran the same check, generation, and
  review-plan flow. It produced equivalent generated Transfer docs and zero
  unmapped review artifacts.

## Boundary

The package's DDL parsing and stale-reference checks are deterministic and
useful. They are not currently evidence that Ashiba should own a generic DDL
documentation product. The checks encode Transfer's review metadata and policy
vocabulary; moving them local preserves their value while removing an Ashiba
package, bin, README/example, version, and package-level support boundary.

## Limits

The experiment rehomed the current implementation before any reduction. It
does not prove which subset Transfer should retain after a future rehome. It
does prove that the monorepo package boundary is not technically required for
the current Transfer output and mechanical checks.

See [DDL Docs Decision](./DDL_DOCS_DECISION.md), [Capability Ownership](./CAPABILITY_OWNERSHIP.md), and [Rehome Experiment](./REHOME_EXPERIMENT.md).
