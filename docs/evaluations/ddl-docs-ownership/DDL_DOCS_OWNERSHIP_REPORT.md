# DDL Docs Durable Ownership Evaluation

## Decision

**REHOME-TO-TRANSFER** means a logical ownership rehome, not an immediate file
move.

| Dimension | Current conclusion |
|---|---|
| Product ownership | Transfer |
| Current repository location | Ashiba monorepo, temporary |
| Ashiba product responsibility | none |
| Operational state | DETACHED-FROM-ASHIBA / TEMPORARILY COLOCATED |
| Physical relocation | deferred |
| Likely future | extract with Transfer to a dedicated repository |

Transfer is itself an experimental sibling product outside the current Ashiba
product family. `ddl-docs-cli` is Transfer-owned experimental tooling. Their
presence in the same monorepo/workspace does not make either an Ashiba product.

## Historical context

Co-location was reasonable when Ashiba aimed at a broad SQL-first toolchain:
SQL tooling, application generation, testing, DDL/review tooling, and Transfer
experiments lived under one exploration. Ashiba has since reduced application
scaffold, DTO/mapper, ZTD/testkit, performance-workflow, and broad CLI/toolchain
ownership. Its current boundary is centered on mechanical SQL, binding, and
verification responsibilities. The historical reason for co-location has
therefore largely disappeared.

## Current Ashiba family

The current family consists of current Ashiba product packages, named
parameter/binding responsibility, current CLI mechanical SQL verification,
optional supported driver/package surfaces, and surfaces required by the Golden
Path or explicitly retained. Transfer and `ddl-docs-cli` are not members.

## Evidence and repository coupling

Current root integration includes `docs:transfer`, `docs:build -> docs:transfer`,
`verify:transfer-ddl-metadata`, `verify:transfer-docs`, and
`scripts/generate-transfer-docs.mjs`. These are inventory evidence of temporary
monorepo integration, not evidence that `ddl-docs-cli` belongs to the Ashiba
product. A later implementation may separate Ashiba's default product workflow
from the experimental Transfer workflow.

The throwaway rehome experiment also showed that Transfer generation, metadata
checking, drift verification, and review-plan mapping do not behaviorally depend
on the current package location. That establishes optional physical placement
and feasible future extraction, not an obligation to move now.

## Ownership boundary

`Transfer -> Ashiba packages` is allowed. Transfer can consume Ashiba as an
experimental product. `Ashiba product -> Transfer-specific product/tooling` is
not intended. The target logical boundary is for Ashiba product build, docs, and
verification to require neither Transfer nor `ddl-docs-cli`; this evaluation
makes no product implementation changes.

`packages/ddl-docs-cli` may remain for now as temporarily colocated Transfer
tooling. Its private package boundary can continue to provide build isolation.
The historical `@ashiba-ts/ddl-docs-cli` and `@ashiba-ts/transfer-dogfood`
namespaces need not be renamed before a likely extraction, avoiding a possible
double migration. Package-local `AGENTS.md` is likewise experimental tooling
guidance, not Ashiba product-distributed AI behavior.

## Capability conclusion

The deterministic stale table/column/index/constraint, DDL ordering,
relationship, and review-plan checks retain real value. The conclusion is
**useful to Transfer but not owned by Ashiba**. Their usefulness does not justify
promoting them into generic Ashiba metadata, ConceptSpec, review-plan, DFD, or
policy frameworks without multiple independent non-Transfer consumers.

## Future direction and limits

A likely candidate direction is to keep only Ashiba product surfaces in this
repository and eventually place Transfer plus DDL-docs tooling in a dedicated
Transfer repository. This is not a roadmap commitment. Transfer value/deletion
evaluation and extraction implementation are separate tasks.

Physical movement is deferred because current behavior works, location is not a
product bug, relocation alone adds no user value, and paying the one-time churn
is more natural alongside any future Transfer extraction. This is not a
compatibility argument.

See [DDL Docs Decision](./DDL_DOCS_DECISION.md), [Consumer Census](./CONSUMER_CENSUS.md), [Capability Ownership](./CAPABILITY_OWNERSHIP.md), and [Rehome Experiment](./REHOME_EXPERIMENT.md).
