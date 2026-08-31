# V3 verification record

## Package and live lane

- `corepack pnpm --dir packages/raw-sql-rules test` passed with 34 required
  artifacts.
- `corepack pnpm --dir packages/raw-sql-rules test:live` passed twice
  consecutively after the disposable-table cleanup correction. Each run observed
  one filtered and one unfiltered row, `ER_DUP_ENTRY` for the duplicate unique
  value, and mysql2 runtime representations recorded in `live-mysql.md`.

## Root CI connection

The package declares `test: node scripts/check.mjs`. The final repository root
command `corepack pnpm test` ran recursive workspace tests against the current
34-artifact state and printed:

```text
packages/raw-sql-rules test$ node scripts/check.mjs
packages/raw-sql-rules test: PASS 34 required artifacts; 4 SQL assets; no interpolation or prohibited package dependencies
packages/raw-sql-rules test: Done
```

The same final run completed successfully: named-parameters 8 tests passed,
layered example 6 passed, VSA example 3 passed, reference example 1 passed with
1 expected skip, and raw-sql-rules passed. This confirms normal root recursive
test discovery without adding a workflow or framework.
