# Attempt evidence executor

`attempt-evidence-executor.mjs` is a non-scoring controller for one frozen
benchmark attempt. It never edits candidate code, decides a cell result, or
infers treatment fidelity. It preserves the evidence required before external
candidate/database cleanup.

## Run a declared attempt

Every `--command` has the form `slot=shell command`. `build`, `typecheck`, and
`test` populate the first-pass record. The controller runs a supplied runner
command only after declared pre-run commands pass. Include the runner's own
`--output` option and pass that JSON back through `--runner-json`.

```powershell
node attempt-evidence-executor.mjs run `
  --candidate-root C:\candidate\run-1 `
  --entrypoint dist\application.js `
  --evidence-root C:\benchmark-evidence `
  --packet C:\packet\execution-packet.json `
  --prompt C:\packet\prompt.md `
  --command "build=npm run build" `
  --command "typecheck=npm run typecheck" `
  --command "test=npm test" `
  --runner-command "node C:\runner.mjs --candidate C:\candidate\run-1\dist\application.js --output C:\runner-output.json" `
  --runner-json C:\runner-output.json
```

The controller hashes the packet and prompt; records redacted stdout/stderr;
stores first-pass command slots; writes pre/post manifests; and snapshots the
candidate source before execution and before cleanup. `.env*`, `.npmrc`, and `.pgpass` are excluded
from source snapshots and listed by hash only. Text logs/snapshots redact
connection passwords and common secret values. Declared commands are trusted
coordinator input and run through the host shell in the candidate directory.

`--dry-run` creates planned command slots without executing them. It is not a
candidate run and cannot be scored.

## Finalize before cleanup

An explicit treatment value is mandatory. The controller intentionally does
not decide whether the candidate used its arm's normal workflow.

```powershell
node attempt-evidence-executor.mjs finalize `
  --attempt-dir C:\benchmark-evidence\attempts\... `
  --treatment-fidelity pass `
  --treatment-note "Review recorded separately." `
  --runner-json C:\runner-output.json `
  --db-summary C:\runner-final-state.json
```

Finalization attaches redacted runner/database evidence, records the explicit
treatment review, writes a complete SHA-256 `evidence-manifest.json`, and then
writes `FINALIZED`. The coordinator must not clean candidate or database
resources until finalization succeeds. The hash manifest detects later edits;
the repository commit is the durable immutability boundary.

## Controller-only verification

```powershell
node --check attempt-evidence-executor.mjs
node attempt-evidence-executor.mjs self-test
```

The self-test creates and removes a temporary fixture, executes only
`node --version`, finalizes as `not-applicable`, and never invokes the benchmark
runner or creates a scored result.
