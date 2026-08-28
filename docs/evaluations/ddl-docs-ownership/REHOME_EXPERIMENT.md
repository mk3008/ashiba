# Rehome Experiment

## Hypothesis

The current Transfer generation and verification flow does not behaviorally
require the existing `packages/ddl-docs-cli` package/filesystem location; it can
run from Transfer-local tooling.

## Method

A throwaway copy of the 30 source files was placed under a temporary
`dogfood/transfer/tools/ddl-docs` location. It used the workspace `rawsql-ts`
dependency and a local TypeScript configuration. A minimal private
`package.json` with only `type: commonjs` was required because the workspace
root is ESM; no name, version, bin, scripts, README, AGENTS, package dependency
list, or workspace registration was required.

The copy built, then ran Transfer's full generation script with only its CLI
path redirected to the local copy.

## Observation

| Measure | Result |
|---|---|
| Build wall time | 2,173 ms |
| Transfer check wall time | 1,432 ms |
| Full Transfer generation wall time | 1,483 ms |
| Retries | 1: added local CommonJS declaration after ESM inheritance error |
| Generated output equivalence | yes: no tracked diff in `docs/generated/transfer` |
| Drift verification | passed |
| Review-plan unmapped artifacts | 0 |

Direct `generate` alone produced 114 common files plus its own `review.md`;
the existing Transfer script intentionally post-processes that output into the
Transfer product review page. Redirecting the full Transfer script produced
equivalent output, so this difference is Transfer orchestration rather than a
package-location requirement.

## Interpretation

The experiment establishes two things:

1. The current physical package/filesystem boundary is optional for behavior.
2. A future extraction with Transfer is feasible.

It does **not** establish an immediate migration obligation. `REHOME-TO-TRANSFER`
is therefore interpreted as logical ownership rehome. The existing private
package may remain temporarily colocated until a separate physical-relocation or
Transfer-extraction task is justified.

## Package ceremony observed as optional

The experiment did not require the package name, version, published-style bin,
package scripts, package README, package AGENTS guidance, workspace package
registration, or standalone minimal-E2E surface. It did retain source code and
a small local runtime/type configuration. This is evidence about physical and
build isolation, not a requirement to delete or move those surfaces now.

## Cleanup

The temporary copy and its generated output were removed after recording these
results. No rehome files are part of this branch.
