# Exclusion and harness-correction ledger

No scored candidate has started at preregistration.

| ID | Classification | Affected cells | Original evidence | Correction commit | Remeasurement | Status |
| --- | --- | --- | --- | --- | --- | --- |
| PREG-002 | User-directed preregistration correction | all future P cells; scored cells at correction: 0 | Prisma 7.10.0 listed in initial preregistration | pending amendment-2 commit | none; no scored cell existed | Prisma 8 RC substituted before execution-packet freeze |

Entries are append-only. A correction does not overwrite the preceding failed
or calibration evidence.
# H-001 — Pre-scoring reference-control serialization defect

- **Observed:** 2026-08-30, before every scored cell.
- **Original evidence:** `fixtures/evidence/reference-control.json` records a
  live PostgreSQL 18.6 reference-control failure only on `close()` assertions.
- **Cause:** the runner's JSON-safe event serialization attempted
  `JSON.parse(JSON.stringify(undefined))` for the specified `close(): Promise<void>`
  result. The reference application correctly resolved with `undefined`.
- **Correction:** `runner.mjs` preserves `undefined` before JSON serialization.
- **Scope:** runner event recording only; public API, workload semantics, oracle
  assertions, and treatment policy are unchanged.
- **Affected scored cells:** none. Scored cells at correction: 0.
- **Required remeasure:** the reference control and negative controls only.
