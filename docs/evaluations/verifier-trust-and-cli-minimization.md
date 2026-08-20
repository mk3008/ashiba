---
title: Verifier trust and CLI minimization audit
---

# Verifier trust and CLI minimization audit

## Decision record

This audit measures the agent system rather than the isolated latency of a
command. It asks which obligations Ashiba can prove precisely, which require
application tests or review, and whether a green verifier result can be used
as a terminal result.

The baseline evidence is [AI-native construction baseline](./ai-native-construction-baseline.md).
Its documentation-only change is [PR #47](https://github.com/mk3008/ashiba/pull/47),
which was open, clean, and had its required CI checks passing when this audit
started. The audit branch is `codex/verifier-trust-audit`; its final commit and
push are reported in the audit handoff.

### Evidence classes

- **Observed** is a command result from a clean disposable control or a
  reviewed fresh-agent repair.
- **Inference** is a scoped conclusion from those observations.
- **Hypothesis** remains a next-experiment question.

Local logs and disposable applications are supplementary evidence only. This
document preserves the command outcomes and their limits; it does not turn
one pilot into a general error-rate claim.

## Current verifier responsibility graph

| Command / responsibility | Proves on success | Does not prove | Dependencies and terminal meaning |
|---|---|---|---|
| `ashiba check` / `project check` | Config, discovered static surfaces, DDL diagnostics, SQL lint, contract and generated-test drift for the discovered project | Runtime execution, business semantics, transactions, live data | No database. Skipped or absent surfaces can still yield success, so success is static-surface success, not total completion. |
| `ashiba check --full` | The fast check and exactly the selected test command exited successfully | What that command covers, including whether it ran live PostgreSQL or transaction proof | The command is application configuration. A green result is terminal only for the selected command plus static surface. |
| Feature contract / generated mapper checks | Canonical SQL, editable TypeScript contract, offline DDL inference, source hash, and applicable generated artifacts agree | Prepared execution, values, all nullability, DTO semantics, transaction behavior | No database. A stale PostgreSQL-derived contract is a failure, but a fresh one is not proof that the current database is unchanged. |
| `feature query postgres-contract` | PostgreSQL can prepare/describe canonical SQL and Ashiba can derive catalog/driver evidence | Statement behavior, rows, locking, custom parser semantics, DTO meaning, transactions | Requires development PostgreSQL and an explicit URL. A prepare failure is terminal for this contract lane only. |
| `sql-resource snapshot` / `compare` | A PostgreSQL-derived query resource and before/after structural compatibility classification | Migration application, business equivalence, runtime performance or locking | Snapshot requires PostgreSQL; comparison relies on snapshot quality and is not semantic equivalence proof. Individual resource error status must be inspected. |
| `check --fix-generated` / generated refresh | Library-owned derivations can be refreshed and application-owned mismatches remain visible | Canonical SQL, application code/tests, or a PostgreSQL contract should be silently repaired | No database. Its output is a repair aid, not a business-correctness result. |

**Observed:** `check --full` calls a caller-selected shell command after a
successful project check. It does not inspect the command's test lanes.

**Inference:** a terminal `ready` status cannot be truthful unless an
application declares the required proof lanes and the verifier can establish
their execution. Ashiba currently has neither fact for arbitrary commands.

## Proof obligation matrix

| Obligation | Strongest current proof lane | Result of this audit |
|---|---|---|
| SQL source ownership | static-provable | Canonical/generated hash drift was detected in D04. |
| Generated freshness | static-provable | D04 was a true positive; a fresh hash says nothing about SQL meaning. |
| Parameter contract | static-provable; PostgreSQL-contract-provable | The relevant static surface is checkable; binding behavior still needs execution tests. |
| Result contract | static-provable; PostgreSQL-contract-provable | D15 mapper type drift was detected; application meaning remains separate. |
| Driver representation | PostgreSQL-contract-provable; behavior-test-provable | Raw driver-to-domain conversion needs application tests, especially `BIGINT`. |
| Schema drift | PostgreSQL-contract-provable | SQL resource / PostgreSQL contract is the dedicated lane; not rerun in the fresh repair pilot. |
| Unsafe runtime SQL syntax construction | currently-unproven for arbitrary application code | The attempted focused D06 mutation retained a bound parameter and was not a valid interpolation oracle. No positive whole-app claim is made. |
| Finite sort allowlist | static-provable when Ashiba safe-sort surface is used; behavior-test-provable otherwise | Not exercised by the clean focused control. |
| Optional-condition metadata | static-provable for Ashiba-owned metadata; behavior-test-provable for meaning | D11 passed static checks after refresh; no live oracle was attached to the clean control. |
| SQL logic semantics | behavior-test-provable | D09 and D11 are intentionally not static proof claims. |
| Transaction commit / rollback | transaction/live-provable | D12/D13 passed static checks; dedicated live rollback proof is required. |
| Locking / concurrency | transaction/live-provable; human/application-owned | Not exercised. |
| Test-lane coverage | currently-unproven | D14 is a measured false-ready. |
| Application DTO semantic conversion | behavior-test-provable; human/application-owned | D15 static drift detection does not validate external API meaning. |
| External application contract | behavior-test-provable; human/application-owned | Not exercised in the clean control. |

## Deliberate defect corpus

The first 12-case Greenfield corpus used a previously constructed application.
It revealed a necessary control condition: that fixture itself had generated
artifact failures, so verifier exit codes could not attribute a failure to a
mutation. It is retained as supplementary live-behavior evidence only; it is
not used for a verifier precision rate. Two malformed mutation scripts
(unsafe sort and early commit) were discarded rather than counted.

The retry used a clean Ashiba starter control. The unmutated control passed
TypeScript, unit tests, `ashiba check --fast`, and `ashiba check --full` with
the selected test command. Eight focused cases were then measured.

| Defect | TypeScript / unit | Fast / full Ashiba | Independent oracle | Classification |
|---|---|---|---|---|
| D04 stale generated metadata | pass | fail | source-hash/catalog mismatch | **True positive** |
| D06 purported unsafe syntax | pass | pass | no valid unbound-interpolation oracle | **Invalid mutation; no safety conclusion** |
| D09 reversed ordering | pass | pass | no live semantic oracle in clean control | **Expected non-detection, not a false negative** |
| D11 optional NULL guard removed | pass | pass | no live semantic oracle in clean control | **Expected non-detection, not a false negative** |
| D12 rollback removed | pass | pass | no live transaction oracle in clean control | **Expected non-detection, not a false negative** |
| D13 early commit | pass | pass | no live transaction oracle in clean control | **Expected non-detection, not a false negative** |
| D14 unit-only full-test lane | pass | pass | required direct live lane failed | **False-ready** |
| D15 `BIGINT` external mapper `string` → `number` | pass | fail | generated mapper contract | **True positive** |

The initial non-green Greenfield corpus independently demonstrated that its
real PostgreSQL behavior tests catch binding, ordering, join, optional
predicate, and rollback failures. That finding supports behavior-test value,
but not Ashiba detection precision because the baseline verifier was already
red.

### Precision findings

- **True positives:** D04 generated source-hash/catalog drift and D15 mapper
  representation drift.
- **False positives:** none measured on the clean control. The non-green
  first corpus is a bad control, not a false positive claim.
- **False negatives:** none claimed where the verifier never owns the
  obligation or where no behavioral oracle ran. D09/D11/D12/D13 are
  deliberate application/live responsibilities.
- **False-ready / false-green:** D14. `check --full` was green because the
  configured command was a no-op, while the separately required lane failed.

## Fresh-agent repair pilot

The repair pilot used isolated disposable copies. It is a small pilot, not a
comparison of model success rates. No runtime token or credit metrics were
available.

| Condition and defect | Observed repair and final evidence | Tool behavior / review surface |
|---|---|---|
| A — Rules Only, D14 | Rewired the ordinary `npm test` path to initialize an isolated PostgreSQL database and run all tests. Final normal run: 8 tests pass; independent live run: 6/6 pass, including commit and rollback. | No Ashiba command. One rejected Windows glob repair was corrected. Review was primarily package test wiring and live test intent. |
| B — Rules + Verify, D14 | Rewired the normal test command to execute the required lane without altering its failing sentinel. Fast check passed; full check then failed at the selected command, correctly surfacing missing proof. | Used fast/full verification, no generator. Correctly reported wiring `done` but live correctness `not done`. |
| C — Full CLI, D14 | Rewired normal test to an actual PostgreSQL lane and replaced the sentinel with canonical-SQL/binding/search/order assertions. TypeScript, fast/full check, generated-mapper check, and direct PostgreSQL lane passed. | Explored help and generated-mapper check; did not use scaffold/model generation/refresh because irrelevant. Two live-test iterations; no generated churn. |
| Tool Available, D14 | Naturally discovered and used fast/full check, then read the source and direct lane. Rewired the path so full check became correctly red for the intentional live failure. | No generator/scaffold/model-gen/refresh; no unnecessary verifier repeats. |
| B — Rules + Verify, D04 | Identified stale generated source hash without altering canonical SQL; repaired two generated metadata locations. TypeScript, unit, fast and full checks passed. | Verifier gave a specific useful signal; no refresh or generator was necessary. Review was a small derived-artifact diff plus canonical-source hash. |

### Agent-system observations

**Observed:** all D14 agents read the ordinary test command and the direct
lane instead of treating the first green verifier output as sufficient. The
Tool-Available agent naturally selected fast/full verification; this is one
observation, not a general adoption rate. Full CLI added command discovery and
an extra generated-mapper check, but selected no generator.

**Observed:** no final false repair occurred. The Rules-Only agent initially
used a Windows-incompatible test glob, observed the failure, and repaired it.
The B and Tool-Available agents intentionally left the failing live sentinel
failing; this is a correct proof-coverage repair, not a business-behavior
success claim.

**Inference:** verifier output can act as a useful static oracle (D04), but
its current text and data cannot establish live-lane completion for arbitrary
application commands (D14). An agent that already has an explicit required
lane can compensate by source-reading and direct testing; the verifier did
not remove that work.

## CLI responsibility classification

| Responsibility | Classification | Evidence and limit |
|---|---|---|
| Static project/contract/generated checks | **Core Proof candidate** | D04/D15 true positives on a clean control; scope must remain explicit. |
| `check --full` command execution | **Core Proof candidate, scoped** | Correctly propagates a selected command's failure after wiring repair; cannot prove lane coverage by itself. |
| Generated mapper check | **Optional Accelerator** | Full CLI used it as additional confirmation; no repair depended on it. |
| Generator/scaffold/model generation | **Insufficient Evidence** | Not selected by current repair tasks. Baseline construction showed both repair and Brownfield mismatch, so no stronger verdict is justified. |
| Refresh | **Optional Accelerator** | Useful to obtain comparable derived artifacts in corpus setup; the D04 repair did not require it. |
| Test command that covers declared required lanes | **Rule Candidate** | All successful repairs were fundamentally wiring/source-review changes; a generic CLI cannot infer arbitrary lane semantics today. |
| SQL behavior, transaction policy, public DTO semantics, application architecture | **Application Responsibility** | D09–D13 and external semantic conversion require live tests and review. |
| Remove candidate | **None** | Non-selection and small-pilot overhead are insufficient deletion evidence. |
| PostgreSQL contract and SQL-resource commands | **Insufficient Evidence** | Their existing focused/live tests establish intended lanes, but no fresh repair run selected them. |

## Product-improvement decision

No product change was made in this phase.

**Observed defect:** D14 is a real false-ready: a full check can be green when
a separately required live lane was not executed.

**Why no prototype was added:** current CLI input is an arbitrary shell
command. Ashiba cannot truthfully infer that its contents include all required
live, transaction, or external-contract obligations. Adding a status format or
new configuration before measuring whether agents can correctly supply and use
that declaration would be a speculative feature. The measured minimal repair
is application-owned test wiring, and the same D14 scenario was rerun under
Rules, Verify, Full CLI, and Tool-Available conditions.

This is not a claim that output improvement is unnecessary. It is an evidence
boundary: the next experiment must test a small explicit proof-lane
declaration before treating `ready | partial | blocked` as a product contract.

## Constitution update

The Constitution remains short and its classifications are preserved except
for stronger boundary evidence:

- Canonical SQL ownership and parameter binding remain **proven/current**.
- PostgreSQL/application contract verification remains a **strong hypothesis**:
  D04/D15 prove useful static derived-contract detection, not business or
  transaction correctness.
- Runtime syntax control, source-bounded capability, subtraction-first
  behavior, finite construction, independently executable resources, and thin
  integration remain **strong hypotheses**. D06 was not a valid unbound
  interpolation oracle and cannot strengthen or weaken that classification.
- SQL/transaction-centered review remains an **open hypothesis**. D04 made a
  small generated diff reviewable; D14 made test-wiring review necessary.
- Application architecture ownership remains an **intentional non-goal**.

## Dynamic SQL questions carried forward

1. Can a safe-sort or finite syntax surface detect an application bypass that
   interpolates directly into a separate runtime query path?
2. Which dynamic sorting needs require another canonical query versus a
   finite subtractive branch?
3. Should an executable PostgreSQL resource accompany named-parameter SQL?
4. Can an application declare required proof lanes without making Ashiba own
   the application's architecture or test runner?

## Remaining risks and next phase

| Priority | Remaining item | Evidence and action |
|---|---|---|
| P1 | Required proof lanes are not machine-declared, so `check --full` can be false-ready. | D14. Prototype a minimal declaration only in a next phase and rerun the same repair scenario before/after. |
| P1 | Static success is often intentionally silent about SQL semantics and transaction behavior. | D09–D13. Add real PostgreSQL oracles to a clean control before measuring false-negative rates. |
| P2 | Fresh-agent evidence for postgres-contract, SQL-resource, refresh, and generators is sparse. | Run matched repair tasks after the live control exists; do not infer deletion. |
| P2 | Whole-application interpolation detection is unproven. | Construct a valid unbound runtime interpolation mutation and a safety oracle. |

Recommended next phase: **Proof Lane Declaration Pilot**. Build one clean
PostgreSQL control with behavior and rollback tests, introduce a minimal
declarative required-lanes manifest outside application architecture, and
compare D14/D12 repair behavior before and after. Do not adopt a `ready`
status unless every declared obligation is demonstrated as proven.

## Attainment

| Acceptance item | Status | Evidence | Gap |
|---|---|---|---|
| Baseline PR integration | **done** | PR #47 has only baseline documentation/evaluation files and passed observed CI. | External review/merge remains external; it did not block this audit. |
| Responsibility graph and proof matrix | **done** | This document maps command success and explicit limits to obligations. | PostgreSQL-contract/SQL-resource fresh repair use is still sparse. |
| Deliberate defect corpus | **done** | Clean control plus eight focused mutations; first non-green corpus is explicitly excluded from precision conclusions. | No full live oracle for every focused semantic/transaction case. |
| Fresh-agent repair pilot | **done** | Rules-only, Rules+Verify, Full CLI, Tool-Available D14 runs, plus D04 Rules+Verify. | One pilot per condition; not an error-rate comparison. |
| Minimal product improvement | **done** (no change justified) | D14 measurement and same-scenario repair evidence show the missing fact is application lane declaration. | Output/declaration prototype remains unmeasured. |
| Constitution and long-lived evidence | **done** | Constitution boundary update and this evaluation. | Review-surface hypothesis remains open. |

**Outcome:** done with bounded evidence. No human decision is required to
complete the audit. A normal review/merge of PR #47 and a later decision to
run the proposed proof-lane pilot are external follow-up, not blockers.
