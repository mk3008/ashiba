# Reproduction and Evidence

This evaluation uses repository evidence rather than a new benchmark because
the critical controlled comparison already exists.

## Current-source reproduction

1. Search `optionalConditionCompression` under `packages`, `examples`, and
   `dogfood` to reproduce the consumer census.
2. Inspect `packages/driver-adapter-pg/src/index.ts` for the fail-closed range,
   text, source hash, and renumbering checks.
3. Run focused tests after building workspace dependencies:

```text
pnpm --filter @ashiba-ts/driver-adapter-core test
pnpm --filter @ashiba-ts/driver-adapter-pg test
pnpm --filter @ashiba-ts/cli test -- parameter-metadata
```

## Existing controlled comparison

`docs/evaluations/dynamic-mechanism-value-ablation.md` records O-A retained
nullable guards, O-B visible marker subtraction, and O-C coordinate metadata
subtraction at 1/10/100 query scales, stale mutations, fresh repair outcomes,
and isolated PostgreSQL behavior.

No credential, generated bulk data, or temporary container is added by this
evaluation. Current runtime behavior is not rerun merely to decide ownership;
Phase 2 live verification is cited as repository evidence.
