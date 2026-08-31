# Reproduction

Materialise outside the repository evaluation tree and install with that
cell's isolated npm cache. The materialiser is deliberately not an evaluator.

```text
node materialize-x1-cell.mjs --cell X1-A-r1 --destination <outside-repository> --npm <node24-npm> --install
set DATABASE_URL=<runner-admin-url>
node runner.mjs --arm A --replicate 1 --candidate <cell>/candidate/dist/report-application.js --source-root <cell>/candidate --output <cell>/evidence/runner.json
```

Before durable cleanup, copy the candidate (excluding `node_modules` and
build-only output where the source/lockfile is retained), packet, command logs,
and evidence to the benchmark evidence tree. The runner itself writes
pre-cleanup database state and cleanup status to `runner.json`.
