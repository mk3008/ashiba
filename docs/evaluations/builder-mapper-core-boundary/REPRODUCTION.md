# Reproduction

This evaluation is documentation and isolated evidence only. It does not
change a product API, package, command, canonical SQL asset, Scope, or the
Golden Path.

## Starting point

- Repository: `mk3008/ashiba`
- Starting commit: `ea71387c1697555b042d6ba76031823be37268b1`
- Node and pnpm: use the repository's pinned toolchain.

## Finite-sort safety control

Run the isolated control:

```text
node docs/evaluations/builder-mapper-core-boundary/evaluation/sort/reviewed-finite-composition.mjs
```

It demonstrates that a closed-world map can accept reviewed keys and reject an
unknown key, hostile key, invalid direction, duplicate key, and an excessive
number of keys. It is not a proposed Ashiba runtime implementation.

## Migration representation control

Build the local CLI, then run:

```text
node packages/cli/dist/index.js ddl migration generate \
  --from docs/evaluations/architecture-fitness-practicality/evaluation/fixtures/ddl/before.sql \
  --to docs/evaluations/architecture-fitness-practicality/evaluation/fixtures/ddl/after.sql \
  --format json
```

The captured output is `evaluation/migration/add-resolved-at.json`. Inspect
`sql`, `summary`, `applyPlan`, and `risks` independently; they are not one
authoritative operation model.

## Repository checks

```text
pnpm verify
pnpm docs:build
git diff --check
```
