# Exclusion and harness-correction ledger

No scored candidate has started at preregistration.

| ID | Classification | Affected cells | Original evidence | Correction commit | Remeasurement | Status |
| --- | --- | --- | --- | --- | --- | --- |
| PREG-002 | User-directed preregistration correction | all future P cells; scored cells at correction: 0 | Prisma 7.10.0 listed in initial preregistration | pending amendment-2 commit | none; no scored cell existed | Prisma 8 RC substituted before execution-packet freeze |

Entries are append-only. A correction does not overwrite the preceding failed
or calibration evidence.

# H-003 — AF baseline TypeScript configuration correction

- **Observed:** 2026-08-30, after AF-V initial attempts had been materialized
  and before the AF-L candidates were allowed to run a runner-owned oracle.
- **Original evidence:** `secondary-evidence/*/initial/` preserves every
  materialized AF-V initial attempt. The candidate skeletons did not all start
  with a shared `tsconfig.json`; candidates that added one did so as a
  treatment-independent packaging repair.
- **Cause:** the AF fixture initially omitted the TypeScript configuration
  required for the frozen strict-TypeScript brownfield baseline. This made a
  baseline prerequisite candidate-owned instead of runner-owned.
- **Correction:** add the identical strict `tsconfig.json` to both frozen
  architecture baselines and include it in their trusted manifests. The public
  API, G1 behavior, treatment policy, assignment, and oracle are unchanged.
- **Affected scored cells:** AF-V A/P/S/D/K/G r1 initial materializations.
  AF-L A/P r1 work was interrupted before any runner result and is excluded as
  unscored setup. No primary benchmark cell is affected.
- **Required remeasure:** all six AF-V r1 cells must use newly materialized,
  isolated candidate directories under the corrected baseline. Original
  attempts remain preserved and are not pooled with corrected observations.
- **Correction commit:** `f7e7b28` (`docs: correct AF baseline TypeScript
  fixture`).
- **Status:** committed. Corrected AF-V cells may now be newly materialized;
  only their post-correction observations may be interpreted.
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
