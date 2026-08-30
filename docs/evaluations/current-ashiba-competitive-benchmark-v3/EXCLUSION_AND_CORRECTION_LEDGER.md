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
- **Correction:** `runner.mjs` preserves `undefined` before JSON serialization
  in commit `e1b3bbc`.
- **Scope:** runner event recording only; public API, workload semantics, oracle
  assertions, and treatment policy are unchanged.
- **Affected scored cells:** none. Scored cells at correction: 0.
- **Required remeasure:** the reference control and negative controls only.

# H-002 — Pre-scoring oracle warning cleanup

- **Observed:** 2026-08-30, before every scored cell.
- **Original evidence:** reference-control execution emitted node-postgres's
  deprecation warning for concurrent `client.query()` calls in the runner's
  read-only final-state collector.
- **Cause:** `databaseState()` submitted independent state reads concurrently
  on one PostgreSQL `Client`.
- **Correction:** issue those runner-owned reads serially in commit `77d4879`.
- **Scope:** diagnostic output and oracle query scheduling only; no public API,
  candidate workload, expected result, or treatment policy changed.
- **Affected scored cells:** none. Scored cells at correction: 0.
- **Required remeasure:** reference and negative controls under Node 24.18.0.
