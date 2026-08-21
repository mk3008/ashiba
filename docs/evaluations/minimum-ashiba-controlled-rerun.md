# Minimum Responsibility Controlled Rerun

## Decision record

This is an ablation-design pilot, not a contest between plain SQL and Ashiba.
It asks what Ashiba must own in code for AI-led Raw SQL work to be safe and
reproducible. The two one-run conditions were:

- **A — Rules Only / minimum Ashiba:** canonical SQL, bound values, no
  open-ended runtime syntax, finite reviewed dynamic syntax, and
  application-owned transaction policy. Ashiba mechanisms were prohibited.
- **B — Rules + mechanisms available:** the identical work item and rules,
  with the ordinary Ashiba workspace available but no named command or
  mechanism prescribed.

**Outcome: partial.** The harness corrections and controlled implementation
observations are useful. Neither arm produced nonce-bound independent evidence
in the runner's required format, so neither is a strict-correctness pass.
One sample never establishes reproducibility.

## Observed

### Harness corrections

The disposable runner v3 recomputes its fixture hash from actual
`manifest.json`, `schema.sql`, and `seed.sql`, normalizing only the private
schema identifier. It owns the W1 expected values: 1,000 matching rows, a
window count of 1,000, 20 page rows, and exact descending IDs from 6000 to
5886 in steps of six. It also requires nonce-bound live evidence, a live
fixture probe, hostile-sort evidence, and W5 rollback/success/one-commit
observations.

Static runner tests passed for the valid case and rejected wrong fixture,
self-report-only evidence, wrong W1 count, correct page with wrong total,
missing live evidence, and missing transaction evidence. The runner's live
fixture probes passed for both arms: four customers, 6,000 orders, and one
customer without orders. Both normalized prepared fixtures had hash
`a4a19f73440577ca413bc35345d6f7ff550b9421e2ac8c5debed2258582614a1`.

The runner itself rejected both final arm directories because the required
nonce-bound `independent-results.json` was absent. This is expected behavior,
not a product failure: arm outputs and a coordinating-agent re-run are not
silently promoted to independent evidence.

### Strict correctness and direct live observations

| Arm | Strict runner | Direct final-source observation | Limitation |
| --- | --- | --- | --- |
| A Rules Only | reject: independent evidence missing | W1–W4 source/tests were present; after the fixed database URL was supplied, W5 success failed with PostgreSQL syntax error near `;`. | No strict evidence; final W1–W5 correctness is not established. |
| B mechanisms available | reject: independent evidence missing | A separate coordinating-agent execution against live PostgreSQL observed W1 count/page/order, W2 string/null contract, W3 no-order retention, W4 sort-to-index plan change with deep rows retained, and W5 rollback/one commit. | Observation is not nonce-bound evaluator evidence, so it is supplementary only. |

For B, W1 returned 20 rows, `matchingRows=1000`, `windowCount=1000`, and
the required IDs. W3 retained customer 4 with a null order. W4 changed
`Seq Scan + Sort` to `Index Scan` and retained the offset-4,000 page. W5
reported injected-failure rollback and one successful commit. For A, the
agent initially lacked the disposable connection setting; the coordinating
execution supplied it and exposed the W5 SQL defect. This is an environment
omission followed by an implementation failure, not evidence that rules alone
cannot work.

### Implementation Pattern Fingerprints

| Field | A Rules Only | B mechanisms available |
| --- | --- | --- |
| Canonical SQL ownership | One `canonical.sql` resource | Nine SQL resources under `sql/` |
| Parameter authoring | PostgreSQL positional `$1`…`$6` | Named `:name` in SQL, application-owned named-to-positional conversion |
| Parameter owner | Application / `pg` | Application / `pg`; no Ashiba-generated binding metadata |
| Optional predicates | SQL boolean guards using null sentinels | Application-owned removal of finite SQL marker blocks |
| Dynamic sort | SQL `CASE` terms plus finite application `sortMap` | Finite application `SORT_TERMS`, inserted into a canonical marker |
| Runtime SQL construction | Bound values and a finite sort selector; no open world | Application-owned subtraction plus finite source-linked sort insertion |
| Capability beyond canonical SQL | No observed open-world expansion | No observed open-world expansion; schema replacement is configuration-driven and was not separately constrained |
| Verify / drift | Ordinary test/driver observation only | Ordinary live commands and driver-contract SQL only |
| Runtime enforcement | Application sort validation | Application sort validation and named-input compiler |
| Generated artifacts | None | None |
| Ashiba mechanism trace | Prohibited and not used | No Ashiba CLI/generated artifact was observed; only ordinary Node/pg tooling was recorded |

Positional binding in A is a permitted Rule-compliant variant, not a rule
violation. B's named parameter compiler, marker subtraction, and sort map are
application-owned implementations: they must not be credited to Ashiba merely
because comparable Ashiba mechanisms exist.

### Rules and deviations

Both arms kept SQL visible and values bound. A used canonical boolean guards,
whereas B used SSSQL-style optional markers; this is an observed design
divergence, not a safety ranking. B did not naturally select an Ashiba CLI in
this one treatment. A's W5 extraction/composition produced a live syntax
error, demonstrating that rules and a visible SQL asset do not mechanically
guarantee correct transaction composition.

## Inference

1. The harness responsibilities are already useful: fixture binding and W1
   assertions prevented a page-length result from being accepted as a total,
   and the strict gate rejected both self-report-shaped outcomes.
2. Rules-only permits at least two safe-looking implementation families:
   boolean guards/`CASE` and marker subtraction/named compilation. One run is
   enough to justify measuring pattern diversity; it is not enough to claim
   instability or convergence.
3. Tool availability alone did not produce observed Ashiba mechanism adoption
   in B. It therefore supplies no evidence for a generator or runtime feature
   being minimum-core, and it does not justify removing one.
4. The A transaction defect is a candidate for stronger verification, but it
   does not identify whether the needed owner is an Ashiba verifier, a runtime
   mechanism, or a better application test.

## Hypotheses and responsibility candidates

| Responsibility | Current classification | Why |
| --- | --- | --- |
| R1 canonical SQL ownership | already measured value | Both arms used it; it supported direct source inspection and live tuning. |
| R2 named parameter convention | variance to measure | A safely used positional authoring; B built an application-owned named converter. |
| R3 runtime SQL addition prohibition | variance to measure | Both avoided open-world syntax in one run, but by different mechanisms. |
| R4 finite reviewed dynamic sort | deterministic enforcement promising | Both built their own finite validation; repeated-agent divergence is unmeasured. |
| R5 optional-condition / SSSQL rule | variance to measure | Boolean guards and marker subtraction both appeared. |
| R6 contract / drift Verify | deterministic enforcement promising | W2 representation concerns were descriptive, not mechanically proved. |
| R7 generated freshness/source hash | lacking evidence | No generated artifact was selected. |
| R8 runtime enforcement | variance to measure | Both application implementations performed enforcement; comparative defect prevention is unmeasured. |
| R9 coordinate metadata subtraction | lacking evidence | B's marker removal worked without coordinate metadata; scale and repair burden are unmeasured. |

A **minimal beneficial Ashiba** is therefore only a hypothesis: preserve the
Rules, plus a trustworthy verifier for fixture/source/contract/transaction
evidence and perhaps finite-sort enforcement if repeated trials show agents
diverge. Named conversion, coordinate metadata, and generated freshness are
not core on current evidence.

## What cannot yet be concluded

There was one Fresh-Agent-style implementation per condition only. The A
environment initially omitted the database URL, and its later direct test
found W5 broken. B's successful direct observation is supplementary rather
than strict evaluator evidence. Consequently this record does not establish
convergence rate, unsafe-divergence rate, natural CLI adoption rate, or that
any Ashiba runtime mechanism prevents a defect.

## Recommended repeated experiment

First repair only the evidence handoff: have a runner-owned verifier emit the
nonce-bound result after executing final source, not an arm-authored JSON.
Then run three Fresh Agents per condition with a fixed injected database URL.
Prioritize R4 finite sort and R6 verification; next compare marker subtraction
with coordinate metadata at 1, 10, and 100 optional-query resources. Do not
remove or add product mechanisms until those repetitions distinguish rules,
verification, and runtime enforcement.

## Answers to the required questions

1. **Was A effectively minimum Ashiba?** Yes as a *Rules-only* minimum: it
   intentionally retained the Ashiba design rules while excluding mechanisms.
   It was not unregulated Raw SQL.
2. **How much freedom was observed?** Two materially different, apparently
   rule-compatible patterns appeared: positional guards/`CASE` and named
   marker subtraction/source-linked terms. A's transaction composition failed.
   The sample is too small to quantify variation.
3. **Which added mechanism showed value?** The evaluator/harness mechanisms
   did: they rejected missing independent evidence and wrong W1 shapes. No
   Ashiba CLI, generator, Safe Sort runtime, or metadata mechanism showed
   incremental value in B because none was observed as used.
4. **What is the minimum useful Ashiba?** Hypothesis: rules plus an
   independently trustworthy verification boundary; finite-sort enforcement
   is a high-priority candidate. This is not a product decision.

## Verification basis and limits

Repository evidence is this record and its documentation index. Disposable
runner, arm source, Docker PostgreSQL, and command output are supplementary
evidence. No Ashiba product behavior changed, and this document makes no
claim of a comparative winner or reproducible agent behavior.
