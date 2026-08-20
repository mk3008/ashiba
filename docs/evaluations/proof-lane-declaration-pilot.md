---
title: Proof Lane Declaration Pilot
---

# Proof Lane Declaration Pilot

## Decision record

**Outcome: partial — experiment completed; product adoption is not justified.**

This pilot asks whether a small application declaration can close the known
false-ready gap: current `ashiba check --full` succeeds after one selected
command succeeds, even when a separately required PostgreSQL or transaction
proof was never executed. It does not ask Ashiba to infer test semantics,
application architecture, or whether an application's chosen declaration is
complete.

The experiment ran on `codex/proof-lane-declaration-pilot`, derived from the
Verifier Trust audit commit `6c6b272877b82fec01ac48025a7d2933a858e3e3`.
PR #47 was left untouched. Because GitHub still reported #47 open during the
pilot, the audit was prepared as the non-duplicating stacked
[PR #48](https://github.com/mk3008/ashiba/pull/48), based on #47's branch;
it can be retargeted after #47 actually merges.

## Acceptance items

| Acceptance item | Status | Repository evidence | Supplementary evidence | Gap |
|---|---|---|---|---|
| Preserve baseline and prepare audit-only PR | **partial** | This report names the immutable source commit and links the audit-only PR. | GitHub reported #47 open; #48 is stacked to avoid duplicated baseline files. | #48 CI/review and retargeting after #47 merge are external state, not evidence that the pilot is complete. |
| Architecture-neutral clean PostgreSQL control | **done** | This report specifies the control contract and its fail-closed boundaries. | Isolated live runs passed behavior and transaction lanes using run-specific schemas. | The disposable fixture is not checked in; the repository claim is deliberately the recorded contract, not a shipped test suite. |
| Reproduce before-state false-ready and D12/D13 gaps | **done** | The exact before/candidate matrix and scope are retained here. | Local command results recorded current green versus direct/candidate red results. | It is a small control, not a defect-rate estimate. |
| Strict declaration prototype and negative cases | **done** | The strict format, states, and explicit limitation are retained here. | Prototype self-test passed seven config cases; missing DB URL and zero-test sentinel were executed locally. | Prototype source is experiment-only and not part of the product tree. |
| Matched Fresh Agent A/B/C and natural adoption | **partial** | The two recorded D14 condition outcomes and their limits are retained here. | Disposable `agent-report.md` files record commands and changes. | D12/D13 fresh repairs and independent Tool-Available adoption were not run because the local agent-thread cap was reached. |
| Decide whether to adopt product integration | **done** | This document records a no-adoption decision and the unmet gate. | No product source/configuration changed. | Re-evaluate only after the missing fresh-agent evidence exists. |
| Update constitution and durable evidence | **done** | Constitution row/rule and this evaluation are versioned documentation. | None required for the wording update. | The classification remains an open hypothesis, not a product guarantee. |

## Verification basis and guarantee limits

Repository evidence is the versioned Constitution, this decision record, and
the documentation build. Disposable controls, Docker-backed PostgreSQL runs,
agent reports, command counts, and timing are **supplementary evidence**. They
support the narrow observed statements but do not justify a general success
rate or a product adoption claim. A green aggregate is expressly limited to
declared command execution.

## Evidence classes

- **Observed**: a command result from the disposable control, prototype, or
  recorded agent run.
- **Inference**: a bounded conclusion from those results.
- **Unproven**: a question not settled by this small pilot.

## Control and prototype

The clean control is an ordinary direct-`pg` Node application. It has no
Ashiba CLI dependency, VSA layout, generator, repository layer, or scaffold.
Its canonical SQL keeps optional search parameterized, chooses sort/direction
from finite maps, paginates, converts driver rows at an application boundary,
and uses explicit `BEGIN`/`COMMIT`/`ROLLBACK` for a transfer.

Its application-owned commands are:

| Required lane | What the control actually checks | Clean PostgreSQL result |
|---|---|---:|
| `static` | syntax/type check plus two unit assertions | pass |
| `postgres-behavior` | optional search, hostile parameter, sorting, pagination, driver conversion | pass (5 assertions) |
| `transaction` | successful commit and failed-transfer rollback | pass (2 assertions) |

Every database invocation creates and finally drops an exact run-specific
schema. `CONTROL_DATABASE_URL` missing, zero test sentinel, a failed behavior
assertion, and a failed transaction all exit non-zero. No URL or password was
printed. The clean aggregate report was:

```text
overall=complete
static=passed, postgres-behavior=passed, transaction=passed
```

The experiment-only runner reads strict JSON (`version`, `required`, and
`lanes` only), executes every declared lane once, and reports
`passed | failed | not-run | missing` per command. Its aggregate is
`complete | failed | incomplete | invalid`; deliberately, it has no `ready`
status. It rejects absent/empty commands, missing required lanes, duplicate
required identifiers, unknown configuration, and inconsistent required flags.
An optional-lane failure remains visible without failing an otherwise complete
required set. Seven self-tests passed.

This runner is **not product code**. It reports command execution and exit
status only; it does not inspect coverage, test count, SQL meaning, or
transaction semantics. Those facts are made fail-closed by this control's
commands, not inferred by the runner.

## Before / candidate mutation results

| Case | Current `check --full` with `npm test` | Direct required oracle | Candidate aggregate | Interpretation |
|---|---:|---:|---:|---|
| Clean control | green | all pass | complete | no false positive observed |
| D14: unit-only selected command while live behavior is red | green | behavior red | failed (`postgres-behavior`) | measured false-ready is prevented when the declaration retains the live lane |
| D12: rollback removed | green | transaction red | failed (`transaction`) | static success does not hide required transaction failure |
| D13: commit before failure sentinel | green | transaction red | failed (`transaction`) | same boundary as D12 |

**Observed:** the existing full check returned green for D14 because `npm test`
ran the unit lane only. The same source state made the direct live command
non-zero and made the candidate aggregate `failed`.

**Observed:** D12 and D13 each remained green under the current full check and
were red under the independently executable transaction lane and candidate
aggregate.

**Observed boundary:** deleting `transaction` from the declared required list
made the remaining declared lanes `complete`. This is correct for the runner's
contract and proves that declaration completeness is an application/review
responsibility, not a fact the runner can derive.

**Observed negatives:** missing DB URL yielded `failed` with both database
lanes failed; the control's zero-test sentinel yielded non-zero. Invalid/missing
required config, empty command, nonzero command, duplicate required ID,
unknown configuration, optional failure, and all-success were covered by the
prototype self-tests. JSON object duplicate keys are not observable after
`JSON.parse`; duplicate *required* identifiers are rejected. A future format
would need an array representation or duplicate-aware parser to reject raw
duplicate lane keys.

## Fresh-agent observations

The requested matched A/B runs were started as a small pilot. Their evidence
is useful but insufficient for an adoption claim.

| Condition | D14 observed behavior | Correctness / review result |
|---|---|---|
| A — Rules + current Verify | Rewired `npm test` to invoke unit, PostgreSQL behavior, and transaction commands. `check --full` then failed closed without a DB URL. | Correct test-wiring repair; static/unit evidence passed. It did not complete a live success run in its timebox. |
| B/C — Rules + required candidate runner | Used the runner, which showed static passed and both DB lanes failed without URL. The agent also hardened inherited JavaScript allowlist keys, rather than repairing the supplied live-order defect. | The runner avoided a false green, but tool output broadened the investigation; final supplied business defect was not proven repaired. |
| Tool Available | not run | The local agent-thread cap prevented an independent natural-adoption run in this pilot. Do not infer adoption or non-adoption. |
| D12/D13 matched fresh repairs | not run | The mutation gates were mechanically demonstrated above, but no fresh-agent comparison is claimed. |

The B/C row is intentionally not counted as a successful repair. It is a
useful observation about terminality: a runner that reports missing live proof
prevents a false completion claim, but it can also cause additional source
review and unrelated hardening. No human intervention occurred.

## CLI responsibility judgement

| Responsibility | Classification now | Reason |
|---|---|---|
| Static `check` | Core Verify | Existing scoped static evidence remains useful. |
| Existing `check --full` selected command | Core Verify, explicitly scoped | It proves that one selected command exited zero, not coverage. |
| Strict proof declaration parser/aggregator | Insufficient Evidence / Rule Candidate | The pilot fixes the measured aggregation gap only when the application has a sound declaration; fresh and maintenance evidence is insufficient for product adoption. |
| PostgreSQL behavior / transaction commands | Application Responsibility | The application owns their meaning, data, and completeness. |
| Generator/scaffold/refresh | Insufficient Evidence | This pilot neither selected nor evaluated them. |
| Removal candidate | None | Non-use or configuration cost alone is not deletion evidence. |

## Verify-first hypothesis and terminality

**Supported only in a narrow sense:** a verifier/aggregator can be more useful
than a generator here because it made a missing required execution visible
without prescribing the app's test framework or architecture.

**Not established:** that this improves overall agent correctness or reduces
human burden. The candidate agent's unrelated allowlist repair and the absent
natural-adoption run are direct counterweights to a stronger claim.

The pilot saw no evidence that `ready`, `blocked`, or `unresolved` adds value
over scoped `complete`, `failed`, `incomplete`, and `invalid`. `complete` must
mean only: *every application-declared required command executed and exited
zero*. It must not claim semantic correctness.

## Product decision and constitution update

No production CLI/configuration change was made; therefore no CLI migration,
new command, or scaffold architecture was introduced. The Phase 11 adoption
gate is **not met**: D14/D12/D13 were separated mechanically and the clean
control did not false-positive, but fresh-agent A/B/C, natural adoption, and
configuration-maintenance evidence remain incomplete.

The Constitution now records declared proof-lane execution as an **open
hypothesis** and explicitly distinguishes a declaration's adequacy from its
mechanically checkable execution result.

## Dynamic SQL questions carried forward

1. Can a null-prototype/closed-world application sort map be recognized or
   reviewed without Ashiba owning the application module?
2. Which live semantic obligations should be declared separately rather than
   combined into a general test command?
3. How should a declaration relate to zero-test detection without making the
   runner framework-specific?
4. Can a duplicate-aware, portable manifest remain smaller than the policy it
   replaces?

## Recommended next experiment

Run independently fresh, time-boxed A/B/Tool-Available repairs for D12 and
D13 and a natural D14 run with a safely pre-provisioned disposable PostgreSQL
URL. Measure final live correctness, source rereads, runner repeats, manifest
churn, and human review surface. Only then consider a backward-compatible
`check --full` integration with one optional declaration input.

## Direct answers

**Does explicit Proof Lane strengthen Rules + Proof realistically, or add
configuration debt?** It realistically closes the *declared-command execution*
gap in D14/D12/D13, but the present pilot has not shown that its configuration
cost is repaid across fresh agents or long-term maintenance.

**What may Ashiba currently say is ready?** Only that its static checks and
every explicitly selected or declared command have succeeded, never that the
application's omitted proof obligations or business semantics are correct.

## Self review

### Cycle 1 — consistency review

- **Resolved:** the first draft did not map every acceptance item to status,
  evidence, and gap. The acceptance table now does so and separates versioned
  repository evidence from disposable supporting evidence.
- **Resolved:** `ready` wording is restricted to the final scoped answer; the
  runner itself uses only `complete`, `failed`, `incomplete`, and `invalid`.
- **Resolved:** no local filesystem paths or unstated test success claims
  appear in this repository-facing report.
- **Retro gate:** no `tmp/RETRO.md` existed in the pilot worktree.

### Cycle 2 — human acceptance review

- **Value:** the before/candidate matrix makes the D14 false-ready closure and
  the D12/D13 transaction boundary visible without claiming semantic proof.
- **Guarantee limit:** the declaration's adequacy, natural adoption, and
  Fresh Agent improvement remain visibly partial.
- **Triage:** no blocker; the missing matched-agent runs are **follow-up**,
  and duplicate raw JSON key detection is a **nit/follow-up** for any future
  format. The report is ready for review as a no-adoption decision record.

**Non-blocking next decision:** accept the recommended defer of product
integration, or explicitly request the bounded follow-up experiment with
pre-provisioned disposable PostgreSQL and independent fresh-agent slots.
