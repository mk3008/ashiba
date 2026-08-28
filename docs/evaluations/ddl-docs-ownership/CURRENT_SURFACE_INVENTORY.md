# Current Surface Inventory

## Package boundary

| Surface | Current fact |
|---|---|
| Package | `@ashiba-ts/ddl-docs-cli`, version `0.3.1`, `private: true` |
| Bin | `ddl-docs` |
| Dependency | `rawsql-ts` |
| Source | 30 TypeScript files / 11,276 LOC reference value |
| Tests | 9 TypeScript files / 3,055 LOC reference value; 64 tests passed |
| Example | one `minimal-e2e` example with 45 files |
| Guidance | package-local `AGENTS.md` |
| Standalone lint | fails: package declares `eslint` command but has no eslint dependency |

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

## Maintenance surface

The private package still owns a package name, bin/help surface, package
metadata/versioning, README and minimal example, AGENTS guidance, build/test/
lint scripts, rawsql-ts compatibility, source/output formats, and root docs
build coupling. The lint gap is a concrete standalone-boundary maintenance
defect, but is not the sole decision reason.
