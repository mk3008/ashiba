# Attempt evidence executor

`attempt-evidence-executor.mjs` is a capture-only bookkeeping utility for a
single benchmark attempt. It does not run a candidate, score a result, modify
the benchmark runner, or decide treatment fidelity.

## Create an attempt record

```powershell
node attempt-evidence-executor.mjs create `
  --candidate-root C:\candidate\run-1 `
  --entrypoint dist\application.js `
  --evidence-root C:\benchmark-evidence `
  --packet C:\benchmark-packet\arm-A.json `
  --prompt C:\benchmark-packet\prompt.txt `
  --command "npm ci" `
  --command "npm run typecheck"
```

The command creates a unique `attempts/<timestamp>-<random>` directory with a
hash-only source manifest, lockfile markers, prompt/packet hashes, redacted
command entries, stdout/stderr stubs, and pending first-pass, treatment,
runner, and database-state slots. It never copies candidate source contents.

## Attach runner-owned results before cleanup

```powershell
node attempt-evidence-executor.mjs finalize `
  --attempt-dir C:\benchmark-evidence\attempts\... `
  --runner-json C:\runner-results\result.json `
  --db-summary C:\runner-results\final-state.json
```

JSON attachments are redacted before being copied into the attempt directory;
the original input hashes are recorded. Cleanup remains an external action and
must be recorded by the benchmark controller after all evidence is preserved.

The manifest intentionally records hashes and paths, not credentials or source
content. PostgreSQL URLs, password/token assignments, and bearer tokens are
redacted in stored text. A hash is not a substitute for a reviewable candidate
source snapshot; the benchmark controller must preserve that snapshot through
its separate candidate-evidence protocol.
