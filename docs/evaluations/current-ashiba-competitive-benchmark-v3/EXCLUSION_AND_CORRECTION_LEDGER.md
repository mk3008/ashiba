# Exclusion and harness-correction ledger

No scored candidate has started at preregistration.

| ID | Classification | Affected cells | Original evidence | Correction commit | Remeasurement | Status |
| --- | --- | --- | --- | --- | --- | --- |
| PREG-002 | User-directed preregistration correction | all future P cells; scored cells at correction: 0 | Prisma 7.10.0 listed in initial preregistration | `496a1f6` (`docs: preregister Prisma 8 RC benchmark arm`) | none; no scored cell existed | completed before execution-packet freeze; Prisma 8 RC substituted |

Entries are append-only. A correction does not overwrite the preceding failed
or calibration evidence.

# H-010 — Primary terminal aggregation and sqlc plugin-fidelity audit

- **Observed:** 2026-08-31 during human publication review.
- **Original evidence:** each immutable primary attempt already retained its
  runner capture and finalization record. The compact extractor nevertheless
  used a legacy cell-root `runner.json` as `finalLive` after later attempts
  were finalized. Six primary sqlc cell snapshots also used plugin 0.1.2
  although the frozen packet specifies 0.1.3.
- **Correction:** `finalLive` now selects the most recent finalized attempt,
  preserving the old cell-root observation as `cellRootLive`. Mixed-plugin
  sqlc cells remain retained but are excluded from a frozen-0.1.3 arm outcome.
- **Affected cells:** terminal selection: `G1-K-r1`, `G1-P-r2`, `G1-S-r1`,
  `T1-A-r1`, `T1-P-r1`, `T1-S-r2`, `T2-A-r2`, `T2-S-r1`; plugin eligibility:
  `G1-S-r1`, `G1-S-r2`, `Q1-S-r1`, `T1-S-r2`, `T2-S-r1`, `T2-S-r2`.
- **Evidence handling:** no candidate, attempt, runner, or source snapshot is
  rewritten. The regenerated index and documents point to the preserved
  sources. See [PRIMARY_RESULT_CORRECTION.md](./PRIMARY_RESULT_CORRECTION.md).
- **Status:** completed in this review-correction change; a future complete
  sqlc 0.1.3 remeasurement remains separate work.

# H-011 — Compact-index reproducibility and qualification metadata

- **Observed:** 2026-08-31 during follow-up human publication review.
- **Original evidence:** an ignored local AF-L-D-r2 runner made a local compact
  rebuild appear byte-identical while a clean Git checkout could not reproduce
  it. Frozen/observed sqlc version qualification was also prose-only.
- **Correction:** add an extractor-backed `pnpm verify:benchmark-index` gate
  that rebuilds JSON/CSV in a fresh temporary directory, requires
  byte-identical outputs, and validates every emitted path/SHA-256 reference.
  Add explicit per-primary frozen-treatment, observed-version-audit,
  frozen-pool-eligibility, and exclusion-reason fields. Clarify that
  `cellRootLive` is legacy provenance, not a first or terminal authority.
- **Affected cells:** all primary index records receive frozen-treatment
  metadata; sqlc H-010 mapping is explicit for all eight sqlc primary records.
  No live outcome, treatment result, pool membership, score, or candidate
  evidence is reselected.
- **Evidence handling:** no candidate, runner, attempt, snapshot, or source
  hash is rewritten. This is an index/schema and verification-path correction.
- **Status:** completed. A detached clean worktree rebuilt the compact index
  byte-identically, and the evidence-content head `3f3ebeb` passed final
  remote `verify` CI. A full frozen sqlc 0.1.3 remeasurement remains separate
  work.

# EXCL-002 — AF-V-S-r2 sqlc plugin 0.1.2 pre-execution setup incident

- **Observed:** 2026-08-31 before the AF-V-S-r2 reliable candidate performed
  generation, candidate verification, or a runner invocation.
- **Original evidence:**
  `secondary-evidence/AF-V-S-r2/reliable-20260831/` retains the pre-action
  packet manifest. It identifies the downloaded `sqlc-gen-typescript` 0.1.2
  tooling while the frozen packet requires 0.1.3.
- **Disposition:** excluded setup incident, not a candidate attempt, repair,
  treatment result, or runner outcome.
- **Correction:** the fresh, disjoint
  `reliable-v013-20260831` root verified sqlc 1.31.1 and
  sqlc-gen-typescript 0.1.3 before the initial candidate action. Its immutable
  pre-action snapshot and every later attempt are retained under that root.
- **Evidence handling:** this is a durable-path relocation from an external
  clean-room root into the repository evidence tree after preservation. The
  materializer/root paths remain recorded in `RUN_MANIFEST.md`; relocation does
  not replace, edit, or reclassify the 0.1.2 setup artifact.
- **Status:** the 0.1.2 path remains excluded. Only the v0.1.3 reliable path
  may be reported as an AF-V-S-r2 candidate sequence.

# H-006 — Frozen packet verification scope clarification

- **Observed:** 2026-08-31 during final-head reproduction review.
- **Original evidence:** the primary packet verifier correctly fails at a
  post-freeze checkout because `EXCLUSION_AND_CORRECTION_LEDGER.md` is both a
  frozen packet input and an intentionally append-only publication record.
- **Cause:** reproduction text did not distinguish verification of the frozen
  packet identity from verification of the evolving publication branch.
- **Correction:** add a wrapper that creates a detached worktree at the
  immutable packet freeze SHA and runs the existing verifier there. It neither
  alters the frozen packet nor regenerates expected hashes.
- **Affected scored cells:** none. This is a reproduction-scope correction,
  not a harness, candidate, or result correction.
- **Correction commit:** `00afb56` (`docs: correct benchmark reproduction
  controls`).
- **Status:** completed; the wrapper's observed PASS is retained in
  `FROZEN_PACKET_REPRODUCTION.md`.

# H-007 — SD-A packed-artifact isolation false positive

- **Observed:** 2026-08-30 in durable `SD-A-r1` evidence.
- **Original evidence:** `secondary-evidence/SD-A-r1/final/sd.json` records a
  static-isolation failure before the schema-drift mutations ran. The copied
  candidate's `package.json` and lockfile reference
  `file:../artifacts/ashiba-ts-named-parameters-0.1.0.tgz`.
- **Cause:** the shared static-isolation regular expression classified every
  relative Ashiba `file:` reference as a workspace reference. The Arm A
  materializer's frozen sibling tarball is explicitly a supplied public-package
  artifact, not a workspace path.
- **Correction:** permit only that exact frozen tarball reference; continue to
  reject all other relative Ashiba references and repository/worktree paths.
  Historical source and result evidence remain unchanged.
- **Affected controls:** `SD-A-r1` only. X1 Arm A materializes its supplied
  tarball at `./vendor/` and was not matched by the faulty expression.
- **Required remeasure:** freshly materialize and rerun SD-A with unchanged
  candidate source, lockfile, and schema-drift mutations; record the new
  result as corrected evidence beside the preserved original.
- **Correction commit:** `00afb56` (`docs: correct benchmark reproduction
  controls`).
- **Remeasurement evidence commit:** `ee94c6a` (`docs: preserve corrected SD-A
  control evidence`).
- **Status:** corrected rerun passed static isolation and completed; the
  original final failure remains preserved beside `corrected-h007` evidence.

## H-007 extension — X1 all-arm correction replay

- **Observed:** the same static-isolation correction required a fresh X1 run
  for every arm because the classifier is shared. The pre-correction X1 r1
  documents remain preserved and are not overwritten.
- **Correction evidence:**
  `secondary-evidence/X1-r2-h007-correction-summary.md` and
  `secondary-evidence/X1-r2-h007-results.json`, with six isolated r2 roots at
  `secondary-evidence/X1-<arm>-r2/corrected-h007/` and matching candidate
  snapshots.
- **Terminal r2 outcomes:** A P after one type-map repair; P F on the missing
  candidate entrypoint with zero candidate repair and no native-pg fallback; S
  P after one exact sqlc plugin/config repair; D P after one array-parameter
  repair; K P initial; G P initial. Static isolation and cleanup pass for all
  six r2 records.
- **Disposition:** r2 supersedes r1 only for terminal X1 interpretation. This
  is a non-aggregate correction replay; it does not alter primary results or
  create a cross-arm ranking.
- **Status:** completed. The aggregate's explicit X1 selection map points only
  at the six r2 terminal runner documents.

## H-007 extension — X1 r3 evidence-preservation remeasurement

- **Purpose:** preserve initial source and command evidence missing from the
  r2 terminal paths without forcing a candidate defect to recur.
- **Observed divergence:** A and D reached static/npm/typecheck PASS rather
  than their r2 initial failures; S stopped at an obsolete absolute sqlc path
  during environment preparation. No r3 runner/oracle, candidate repair,
  treatment-fidelity result, or database cleanup is claimed.
- **Evidence:**
  `secondary-evidence/X1-r3-h007-evidence-preservation-noncomparability.md`
  and `secondary-evidence/X1-r3-h007-evidence-preservation-hash-verification.json`;
  source/snapshot hashes match for A, S, and D. Exact external roots were
  removed after durable preservation.
- **Disposition:** excluded, non-comparable, and non-pooled. The aggregate
  indexes these roots only as `excludedCorrections`, never as secondary cells
  or results. The r3 procedure neither replaces nor adjudicates r2 outcomes.
- **Status:** completed as evidence preservation; no benchmark result exists.

# EXCL-001 — AF-L r2 evidence-preservation setup attempts

- **Observed:** 2026-08-31 before any AF-L r2 runner oracle result.
- **AF-L-A-r2:** an initial candidate typecheck failure was repaired before the
  required initial source/log snapshot was preserved. The available final
  source is retained under
  `secondary-evidence/AF-L-A-r2/excluded-evidence-preservation-incident/`,
  but it is not a scored attempt.
- **AF-L-D-r2:** a setup worker deleted candidate source files before it ran a
  verifier or preserved attempt evidence. No candidate result is retained or
  interpreted.
- **Scope:** no primary, AF-V, runner, fixture, or product evidence changed.
- **Disposition:** both setup attempts remain excluded. Each affected cell was
  then freshly materialized and executed under the frozen packet with immutable
  per-attempt snapshots; those later runs are separate evidence.
- **Completion evidence:** AF-L-A-r2 reliable rerun is `0e72b59` (`docs:
  preserve reliable AF-L A replicate two evidence`); AF-L-D-r2 reliable rerun
  is `587a4cd` (`docs: preserve AF-L Drizzle replicate two evidence`).
- **Status:** completed as an exclusion disposition. The excluded setup paths
  are not pooled with either reliable rerun.

# H-004 — E1 forbidden-marker packet omission

- **Observed:** 2026-08-30, after E1 candidate directories were materialized
  but before any E1 runner result was recorded.
- **Original evidence:** the interrupted materializations remain outside the
  durable scored/control set; `E1-A-r1` completed candidate-local preparation
  and `E1-P-r1`/`E1-S-r1` were interrupted before runner execution.
- **Cause:** the E1 runner API required arm-specific forbidden treatment
  markers to be frozen in each exit packet, but the materializer copied no
  such packet file.
- **Correction:** freeze `FORBIDDEN_PATTERNS.json`, copy it into every E1
  packet, and write the arm-specific patterns into `CELL.json`. The patterns
  match executable imports/dependency entries/configuration markers rather
  than explanatory prose.
- **Affected controls:** all six pre-correction E1 materializations; no E1
  runner output and no primary cell is affected.
- **Required remeasure:** discard those materializations as unscored setup and
  freshly materialize every E1 cell after the correction commit.
- **Correction commit:** `85592fd` (`docs: freeze E1 treatment removal markers`).
- **Completion evidence:** `2dc56c2` (`docs: preserve corrected E1 removal
  evidence`) preserves freshly materialized post-correction records for all
  six arms.
- **Status:** completed as a packet correction. The earlier materializations
  remain excluded; the six corrected E1 records are separately retained.

# H-005 — E1 runtime-install precondition omission

- **Observed:** 2026-08-30, on the first post-H-004 E1-A runner invocation.
- **Original evidence:** the runner output is preserved as excluded setup
  evidence. It failed at import because materialization intentionally excludes
  `node_modules` and the candidate had no installed `pg` runtime.
- **Cause:** E1 packet/reproduction material specified source copying but did
  not freeze the runner-owned lockfile installation needed before the runner
  imports the exit candidate.
- **Correction:** freeze `PRE_RUN_ENVIRONMENT.md`; before every E1 runner
  invocation, the runner owner executes Node 24 `npm ci --ignore-scripts` with
  a cell-local npm cache. This is environment preparation, not a candidate
  repair, and does not alter the source snapshot manifest.
- **Affected controls:** E1-A-r1 post-H-004 initial runner result and all
  post-H-004 materializations prepared under the incomplete packet. No primary
  cell is affected.
- **Required remeasure:** preserve H-004/H-005 setup evidence, freshly
  materialize every E1 arm under the completed packet, then execute the frozen
  pre-run installation before candidate generation and runner import.
- **Correction commit:** `d91c2bd` (`docs: freeze E1 runtime installation step`).
- **Completion evidence:** `2dc56c2` (`docs: preserve corrected E1 removal
  evidence`) records the completed packet's required pre-run installation and
  the six runner outcomes.
- **Status:** completed as an environment-precondition correction. The
  earlier setup failure remains excluded.

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
- **Completion evidence:** `757a07b` (`docs: preserve corrected AF-V control
  evidence`) retains newly materialized post-correction AF-V observations.
- **Status:** completed as a fixture correction. Only post-correction AF-V
  observations may be interpreted; the original attempts remain preserved.
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
