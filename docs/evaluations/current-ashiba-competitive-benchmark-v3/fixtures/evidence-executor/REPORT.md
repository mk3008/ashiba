# Evidence executor report

Status: `implemented` (capture utility only; no benchmark cell is scored here).

The executor provides one deterministic bookkeeping path for each attempt:

1. create a unique attempt directory;
2. hash the candidate source tree and mark lockfiles;
3. hash the exact prompt and packet inputs;
4. create redacted command/log and result slots;
5. attach redacted runner JSON and database final-state summaries before cleanup.

It does not execute candidates, alter `runner.mjs`, infer pass/fail, or replace
the runner-owned oracle. `cleanup` remains pending until the benchmark
controller records cleanup after all durable evidence has been saved.

## Verification

```powershell
node --check attempt-evidence-executor.mjs
```

The parent benchmark controller should also run a create/finalize smoke with a
throwaway candidate directory and retain the generated attempt record as part
of its own execution evidence.
