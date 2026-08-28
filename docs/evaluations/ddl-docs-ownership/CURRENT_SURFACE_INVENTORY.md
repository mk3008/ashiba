# Current Surface Inventory

## Package boundary

| Surface | Current fact | Ownership interpretation |
|---|---|---|
| Package | `@ashiba-ts/ddl-docs-cli`, version `0.3.1`, `private: true` | Historical namespace; temporarily colocated Transfer tooling, not an Ashiba internal product package. |
| Bin | `ddl-docs` | Current tooling entry point; physical cleanup deferred. |
| Dependency | `rawsql-ts` | `Transfer -> Ashiba packages` consumption is allowed. |
| Source | 30 TypeScript files / 11,276 LOC reference value | Inventory only. |
| Tests | 9 TypeScript files / 3,055 LOC reference value; 64 tests passed | Retained deterministic-tooling coverage. |
| Example | one `minimal-e2e` example with 45 files | Tooling-local surface. |
| Guidance | package-local `AGENTS.md` | Temporarily colocated experimental-tooling guidance, not Ashiba product-distributed AI behavior. |
| Standalone lint | fails: package declares `eslint` command but has no eslint dependency | Known gap; not fixed by this evaluation. |

LOC is inventory only, not a decision score.

## Commands

| Command | Current role |
|---|---|
| `generate` | DDL and review-metadata to Markdown/VitePress artifacts |
| `prune` | Removes package-managed generated artifacts |
| `check` | Validates DDL, metadata, order, and referenced review assets |
| `concept-site` | Generates Concept/DFD/Process site pages |
| `concept-display-name` | Mutates Concept registry display-name metadata |
| `structured-concept check|build` | Validates/builds structured Concept derivatives |
| `review-plan` | Maps Transfer review sources to policy and review diagnostics |

## Root integration inventory

The repository currently includes `docs:transfer`, `docs:build -> docs:transfer`,
`verify:transfer-ddl-metadata`, `verify:transfer-docs`, and
`scripts/generate-transfer-docs.mjs`. These are temporary monorepo integration
surfaces, not evidence of Ashiba product-family membership.

## Maintenance interpretation

The private package still creates repository-local experimental maintenance:
package/build configuration, tests, docs generation, root integration, and the
known standalone lint gap. Those costs are real, but are not counted as Ashiba
product Maintenance Surface after the logical ownership rehome. The package may
remain temporarily as build isolation; package rename and physical relocation
are deferred.
