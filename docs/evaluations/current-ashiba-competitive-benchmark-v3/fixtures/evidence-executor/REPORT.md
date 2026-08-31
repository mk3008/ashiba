# Attempt evidence controller report

Status: `implemented; non-scoring`.

The controller addresses the P0 immutable-evidence requirement. It runs only
coordinator-declared commands, captures redacted immutable stdout/stderr,
records first-pass command slots, hashes packet/prompt inputs, creates source
manifests and a pre-cleanup reviewable snapshot, attaches runner/database
evidence, requires an explicit treatment-fidelity value, and produces a
whole-attempt SHA-256 manifest before external cleanup.

It deliberately does not score behavior, infer treatment fidelity, modify a
candidate or the runner, or clean external resources. This keeps evidence
capture separate from the runner-owned oracle and publication scorer.

## Verification

```powershell
node --check attempt-evidence-executor.mjs
node attempt-evidence-executor.mjs self-test
```

The self-test is controller-only and produces no benchmark cell.
