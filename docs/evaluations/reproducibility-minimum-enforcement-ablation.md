# Reproducibility and Minimal Enforcement Ablation

## Status

**Partial, with a completed runner-owned evidence lane.** This is a small,
controlled repeatability measurement, not a product comparison or a basis for
removing a CLI. The runner, rather than an implementation arm, prepared an
isolated PostgreSQL schema, injected its URL/schema/fixture, executed final
source, independently checked W1--W5, and wrote the nonce-bound result.

The harness used four customers and 6,000 orders. It asserted: W1 a 20-row
page and a 1,000-row pre-pagination count; W2 active-customer ordering and a
nullable result field; W3 left-join retention of the customer with no orders;
W4 a deterministic offset-4,000 page plus an index plan; and W5 rollback and
one committed marker. A hostile sort key had to be rejected. The arm was
forbidden to create `independent-results.json` or any self-authored evaluator
result.

Runner positive execution passed. Negative harness checks rejected arm-only
JSON, wrong nonce, changed fixture, a page substituted for the total, and
incorrect transaction observations. A runner defect discovered during this
phase (mixed aggregate/order and order-list actions) was repaired before any
trial was launched; no Ashiba product code changed.

## Conditions and fairness

All six executed fresh runs used the same work item, model/role, permissions,
timebox, injected database contract, runner and independent evaluator. They
had no predecessor context. PostgreSQL access was deliberately withheld from
the agents and supplied only by the runner, avoiding a missing-URL difference
between arms.

| Condition | Runs | Available responsibility |
| --- | ---: | --- |
| A -- Rules Only | 3 | Ashiba rules; no Ashiba CLI, generated model, adapter runtime, or safe sort. |
| B -- Rules + Verify | 3 | The same rules and verification features, with no generator, scaffold, generated model, adapter runtime, or dynamic helper. Agents were not told to use a command. |
| C -- Rules + Verify + finite-sort enforcement | 0 / not applicable | See the applicability decision below. |

## Independent results

| Condition | Run | Runner result | Observed strict failure |
| --- | --- | --- | --- |
| A | A1 | pass | -- |
| A | A2 | fail | W1 rows/count differed from runner-owned expectation. |
| A | A3 | pass | -- |
| B | B1 | pass | -- |
| B | B2 | pass | -- |
| B | B3 | pass | -- |

Each result is runner-authored, includes the source-file hashes, the
fixture hash, and a run nonce. The failed A2 result is an evidence record, not
an absent result or a repaired arm. Thus strict correctness was **2/3 for A**
and **3/3 for B**. This sample is too small to assign the difference to Verify:
no B agent naturally invoked an Ashiba verification command, and the runner
found no defect that an Ashiba Verify command had previously surfaced.

## Source-derived pattern fingerprints

The evaluator inspected final source, not arm self-report.

| Condition | Canonical SQL | Parameters | Optional predicate | Dynamic sort | Transaction | Ashiba Verify/runtime observed |
| --- | --- | --- | --- | --- | --- | --- |
| A1 | external SQL files | positional | dedicated canonical resources | finite map | explicit BEGIN/COMMIT/ROLLBACK | none |
| A2 | embedded SQL | positional | conditional application path | complete reviewed term map | explicit | none |
| A3 | external SQL files | positional | dedicated canonical resources | finite map | explicit | none |
| B1 | external SQL files | positional | dedicated canonical resources | finite map | explicit | none |
| B2 | external SQL files | positional | dedicated canonical resources | finite map | explicit | none |
| B3 | external SQL files | positional | dedicated canonical resources | finite map | explicit | none |

All six final sources bound values, validated a finite sort key/direction,
kept runtime SQL within reviewed terms, and used an explicit transaction
boundary. No source-derived open-world identifier/sort interpolation was
observed. This is not proof that no unsafe construction exists beyond the
checked surface.

Convergence is therefore **2/3 A** to the external-SQL/finite-map family
(A2 was a separate embedded-SQL/complete-map family), and **3/3 B** to that
family. Pattern diversity was two in A and one in B. Unsafe or incorrect
divergence was one in A (the strict W1 mismatch) and zero in B. Because the
samples were independently produced but small, these are measurements, not a
causal claim that verification availability produced convergence.

## R6: verification value

**Not demonstrated by this ablation.** B exposed verification but no agent
naturally selected it, so no schema/driver mismatch, source-freshness,
parameter/result mismatch, or transaction-composition defect was actually
detected by Ashiba Verify. The runner did detect A2's live W1 mismatch, but
the runner is evaluation infrastructure, not evidence that a product verifier
would have caught it. There was no false repair: failed source was retained.

The useful conclusion is narrower: independently executing final source is a
required measurement boundary. Tool availability alone is not evidence of
tool value.

## R4: finite sort enforcement applicability

Existing Ashiba Safe Sort is a deterministic runtime mechanism over a
generated query model: its PostgreSQL adapter requires a source hash, compiled
binding metadata, safe-sort insertion metadata, and a canonical top-level
`ORDER BY` containing the finite reviewed terms. The generic final-source
fixture intentionally does not prescribe those artifacts or that adapter.

Supplying a generated query model and adapter starter only to C would make the
treatment a supplied architecture/scaffold experiment rather than an
enforcement ablation. Creating a generic Safe Sort or extending the current
one is explicitly out of scope. C is consequently **not applicable**, rather
than silently implemented as another B run. No claim about Safe Sort reducing
variance or unsafe divergence follows from this phase.

## Responsibility judgment

| Responsibility | Current judgment | Evidence / limit |
| --- | --- | --- |
| Rules: binding, finite syntax, visible SQL, explicit transactions | Keep | All runs followed them; A still had one behavioral failure. |
| Runner-owned live evidence | Core Verify candidate | It rejected self-report and recorded a real final-source mismatch. This is benchmark infrastructure, not yet a product API decision. |
| Ashiba verification CLI | Insufficient evidence | Available B agents did not select it. Do not remove it on that basis. |
| Existing Safe Sort | Insufficient evidence | Correctly non-fit for this generic fixture; no product change justified. |
| Application SQL/resource layout and transaction policy | Application responsibility | Both external and embedded canonical ownership families were viable. |

## Next optional-condition experiment (R9)

Run the same runner/evaluator with one identical optional predicate expressed
as (1) Rules-only optional handling, (2) application-owned marker
subtraction, and (3) Ashiba coordinate-metadata subtraction. Repeat each at
1, 10, and 100 canonical query resources. Hold the database, query semantics,
model/role, source contract and verifier fixed. Measure strict correctness,
strategy consistency, runtime and generation cost, source/metadata freshness,
review surface, repair burden and agent variance. Do not add a query builder
or expand SSSQL before that measurement.

## Answers

- **Rules-only convergence:** 2/3 converged to external SQL plus a finite map;
  1/3 used embedded SQL plus a complete reviewed term map. Strict pass rate
  was 2/3.
- **Did Verify improve correctness or false repair?** Not established. B was
  3/3 strict pass, but no B run used Ashiba Verify; only the independent runner
  demonstrated a concrete detection, and it caused no false repair.
- **Did finite sort enforcement reduce variance?** Unmeasured. Existing Safe
  Sort was not naturally applicable without supplying architecture-bearing
  generated artifacts.
- **Rules versus deterministic code:** rules are sufficient for the observed
  bounded SQL patterns, but not for proving final behavior. Runner-owned
  independent execution has demonstrated value. The value of a product-owned
  deterministic finite-sort mechanism remains open.
- **Minimum beneficial Ashiba (hypothesis):** the Rules plus a trustworthy,
  project-adaptable verification boundary. Existing Safe Sort, generated
  metadata, named conversion, and coordinate subtraction are not minimum-core
  on this evidence.

## Limits

There are only six executable trials and no C trial. Command counts, bytes
read, tokens, credits, and exact wall-time telemetry were not exposed by the
Fresh-Agent runtime, so they are recorded as unavailable rather than
estimated. This record must not be used to claim an A/B winner or to delete a
CLI.
