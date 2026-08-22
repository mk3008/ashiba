# Raw SQL normative boundary & runtime minimality audit

## Executive summary

**Decision status: partial, evidence-backed for the narrow PostgreSQL workloads.** The experiment began with seven mechanism-neutral candidate rules and compared three guidance conditions under a shared task/safety specification. The scored Fresh-Agent matrix is G0 2/2, G1 2/2, G2 2/2 strict runner passes. All six scored submissions satisfied W1–W4, and the G1 cells did so without Safe Sort or SSSQL names. This weakens the claim that those names are mandatory agent knowledge for the registered outcomes; it does not show that the mechanisms have no ergonomic, proof, or performance value.

The shared packet was itself strong: all treatments received canonical named-SQL requirements, a null-guard optional-filter shape, a finite sort capability, and a prohibition on raw runtime strings reaching SQL. Therefore G0 is interpreted as **common task specification only / no Ashiba-specific guidance**, not as an unconstrained “general knowledge only” condition. The observed equality of G0/G1/G2 may partly reflect that shared specification.

Post-run review also narrowed the proposed normative conclusion. W2 empirically exercised only finite runtime ordering, so the experiment does not justify a general rule that any finite runtime-selected SQL fragment is allowed. W1 exercised only `NULL` and present-value optional inputs, so omitted/`NULL`/value three-state semantics were not tested. The refined post-experiment proposal is recorded in [proposed-minimum-contract.md](./fixtures/raw-sql-normative-boundary/proposed-minimum-contract.md); the original seven-rule G1 treatment remains preserved unchanged in [initial-candidate-rules.md](./fixtures/raw-sql-normative-boundary/initial-candidate-rules.md).

R1 and R2 emitted identical positional SQL and values for the registered cast/string/comment/repetition edge case and both passed PostgreSQL. That proves a dedicated driver is not necessary for this one named-lowering responsibility, not that all existing driver responsibilities are unnecessary.

## Acceptance attainment

| Acceptance item | Status | Evidence | Gap |
| --- | --- | --- | --- |
| Current-surface inventory | done | Source-linked [inventory](./fixtures/raw-sql-normative-boundary/responsibility-inventory.md). | Product classification remains a proposed decision. |
| Normative versus agent-help separation | done | “Normative rule versus agent-help distinction” below and G0/G1/G2 matrix. | Two replicates do not estimate population rates. |
| 5–10 mechanism-neutral candidate rules | done | Historical seven-rule G1 treatment plus refined [post-audit proposal](./fixtures/raw-sql-normative-boundary/proposed-minimum-contract.md). | Final product acceptance remains separate from experiment outcome. |
| Same-profile/timebox guidance experiment | done | v6 runner records and [dispatch ledger](./fixtures/raw-sql-normative-boundary/evidence/dispatch-ledger.md). | The common task packet contains strong shared constraints, reducing treatment contrast. |
| W1–W4 deterministic PostgreSQL oracle | done | Workload specification, evaluator, and six strict-pass records. | Static construction scan is intentionally incomplete; W1 does not cover omitted-vs-NULL semantics. |
| R1/R2 runtime ablation | partial | Lowering and explicit transaction-client controls in [runtime evidence](./fixtures/raw-sql-normative-boundary/evidence/runtime-ablation.json). | It does not replace testing every adapter responsibility. |
| Human reviewability record | done | Per-candidate [human review record](./fixtures/raw-sql-normative-boundary/human-review.md). | It is a structured review, not proof of absence of defects. |
| Durable protocol and adaptive history | done | Manifest, decision log, candidate artifacts, evaluator, results verifier, and reproduction procedure. | Prior historical evaluations retain their own documented evidence limits. |
| Product-source restraint | done | This phase adds evaluation documentation and evidence only. | Product reduction remains a later decision. |

## Question

What is the minimal long-lived Ashiba contract for raw SQL; which current surfaces are rules, general guidance, recipes, mechanical tooling, application ownership, historical/optional material, or removal candidates; and does that contract require Safe Sort, SSSQL, a dedicated thin driver, or detailed guidance?

## Why this matters

Product mechanism names can be mistaken for requirements. A reviewer must be able to identify what Ashiba requires, what is merely a good SQL practice or implementation recipe, what application semantics must be supplied as requirements, and what runtime must not hide.

## Initial candidate model and post-run refinement

The preregistered G1 treatment used the seven rules in [initial-candidate-rules.md](./fixtures/raw-sql-normative-boundary/initial-candidate-rules.md). Those rules are historical experiment input and are not rewritten after seeing results.

External review identified that the initial Rule 4 (“any runtime-selected SQL syntax may come from a finite reviewed set”) generalized beyond the evidence: the matrix exercised only finite runtime ordering. The post-experiment design proposal therefore narrows the explicit syntax exception to application-specified finite ordering while allowing selection among complete reviewed SQL assets. It also separates application-supplied optional-input and sort semantics from Ashiba-specific mechanism guidance. See [proposed-minimum-contract.md](./fixtures/raw-sql-normative-boundary/proposed-minimum-contract.md) and the final decision-log entry.

## Scope / non-scope

This phase changes only evaluation evidence and documentation. It does not remove product APIs, alter generated application code, or generalize the result beyond the pinned Node/PostgreSQL host. It is not a productivity benchmark or proof about MySQL/SQL Server.

The phase does **not** determine omitted/`NULL`/value three-state semantics for optional search inputs. Those semantics are an application/API requirement when the states are distinguishable. It also does not establish what every application's sort capability should include; the workload fixes only `title | priority` and `asc | desc`.

## Existing responsibility inventory

The full source-linked inventory—including Verify, scaffold/generated metadata,
the Constitution candidate, and prior evaluations—is
[responsibility-inventory.md](./fixtures/raw-sql-normative-boundary/responsibility-inventory.md).

| Surface | Provisional classification | Evidence and interpretation |
| --- | --- | --- |
| Complete visible SQL source asset | Normative Rule | The source may be a file or exported string; filesystem ownership is not the rule. |
| Named parameters | Normative Rule | Keeps runtime-value meaning visible in source; positional lowering is execution mechanics. |
| No runtime-added SQL fragments from open-ended input | Normative Rule | Structural injection boundary independent of a specific API. |
| Finite runtime ordering | Explicit normative exception candidate | W2 shows finite reviewed ordering selection can satisfy the registered requirement; evidence does not generalize this to arbitrary finite JOIN/projection/predicate fragments. |
| Complete SQL asset selection | Allowed composition boundary | Selecting among complete reviewed queries does not require runtime fragment addition. |
| Query-local purpose/reviewability | Normative Rule | Top-level design goal operationalized as local source assets and intentional sharing only. |
| Optional predicates in complete SQL | Pattern / Recipe | W1 shows the registered NULL/value semantics can live in complete SQL without mandatory rewriting. |
| SSSQL compression | Mechanical Tooling / optional accelerator | Metadata-backed removal can improve a query shape but is not required by the tested W1 semantics. |
| Safe Sort | Pattern / optional tooling | It is one implementation of a finite application-defined ordering capability; the name/API was unnecessary in G1 for W2. |
| SQL readability, comments, client compatibility, duplication policy | SQL Guideline | Useful independently of Ashiba; not all are enforcement rules. |
| PostgreSQL named binder | Mechanical Tooling | R1 proves a comprehensive implementation; R2 proves the narrow lowering can be application-owned. |
| Pool, transaction, retries, business policy | Application-owned | Current runtime boundary explicitly keeps them visible to the application. |
| Generated metadata, source hash rejection | Mechanical Tooling | Deterministic support/proof for optional rewrite and stale-artifact safety, not the normative goal itself. |

## Environment

Baseline was `origin/main` `d130dfe`. Runs used Node 22.14.0, the locally running `postgres:18` Docker container, node-postgres, and runner-created/drop-cleaned nonce schemas. The container's persisted login did not match its initial environment setting; a temporary role limited to `CONNECT, CREATE` was created for the evaluator and removed after the run. This is an environment fact, not product evidence.

## Treatments

Every scored cell received the same common assignment and workload specification. That common packet already required canonical named SQL, typed null guards for W1, a finite W2 capability, and rejection of raw runtime strings reaching SQL.

- **G0 — common task specification only / no Ashiba-specific guidance.** The historical assignment heading says “PostgreSQL general knowledge only,” but this report uses the more precise interpretation because the common packet itself contains safety and shape constraints.
- **G1 — common task specification + seven candidate minimum Ashiba rules.** No named product mechanism or implementation recipe was supplied.
- **G2 — common task specification + current relevant Ashiba guidance.** Runtime-boundary, named-binding, optional-condition, Safe Sort, and SSSQL guidance were available.

Each scored cell used the same worker profile, inherited permissions, packet, and a recorded 20-minute deadline; the [dispatch ledger](./fixtures/raw-sql-normative-boundary/evidence/dispatch-ledger.md) records completion before deadline. The treatment contrast is therefore **additional Ashiba-specific guidance above the shared task specification**, not safety specification versus no safety specification.

## Workloads

W1 optional filters, W2 finite runtime ordering, W3 similar-but-distinct queries, and W4 named-lowering lexical edge cases are frozen in [workload-spec.md](./fixtures/raw-sql-normative-boundary/workload-spec.md).

Important requirement boundaries:

- **W1:** every combination of `NULL` and a present value is evaluated. Omitted/not-supplied versus explicit `NULL` is not part of the workload. Therefore this phase cannot decide a three-state optional-input contract.
- **W2:** the application capability is explicitly frozen as `sort = title | priority` and `direction = asc | desc`, with hostile sort rejection. The result says nothing about whether another application should support projected columns only, special `CASE` orderings, multiple keys, `NULLS FIRST/LAST`, or other semantics.

## Evaluator / oracle

The runner owns fixture data, hostile input, nonce schema, callable invocation, source checks, and JSON records. It checks functional results, hostile parameter and sort paths, optional combinations, named source assets, lexical binding edge cases, and a narrow direct-driver construction signal. It cannot prove absence of every construction path; see [evaluator specification](./fixtures/raw-sql-normative-boundary/evaluator-spec.md).

## Adaptive decision log

The first dispatch and multiple evaluator iterations were calibration, not scored. The durable [decision log](./fixtures/raw-sql-normative-boundary/decision-log.md) records assignment-interface ambiguity, unregistered W4 assertions, finite-manifest traversal, the missing timebox record, and the post-run interpretation correction. No results from different evaluator versions are combined.

The final correction changes **interpretation only**: no prompt, candidate, evaluator, or scored result is changed. It records why G0 is no longer described as unconstrained general knowledge, why W1 does not support a three-state optional-input claim, and why W2 does not empirically justify broad finite runtime SQL construction.

## Run matrix

| Treatment | Scored cells | Strict PostgreSQL pass | Reading |
| --- | ---: | ---: | --- |
| G0 | g0-r5, g0-r6 | 2 / 2 | Shared task specification without Ashiba-specific guidance produced two complete passes. |
| G1 | g1-r5, g1-r6 | 2 / 2 | Shared task specification plus candidate rules produced two complete passes without mechanism names. |
| G2 | g2-r3, g2-r4 | 2 / 2 | Shared task specification plus current guidance also produced two complete passes. |
| R1 | current adapter compiler | pass | Correct named lowering and PostgreSQL result for the registered edge case. |
| R2 | application-owned lowering | pass | Same emitted SQL/values and PostgreSQL result for that edge case. |

The authoritative per-cell records are [results.json](./fixtures/raw-sql-normative-boundary/evidence/results.json); superseded calibration records remain under `evidence/calibration/`.

## Observed

All scored cells passed hostile sort rejection, hostile value handling, W1 NULL/value combinations, W3 locality, and W4's registered lexical/result assertions. The G1 passes did not require Safe Sort or SSSQL names. G2 used those names but did not produce a distinct observable safety outcome in two replicates.

Because the common packet already specified the key safety and application boundaries, this observation supports **mechanism-name minimality under a specified contract**. It does not show that an unconstrained agent would independently derive the same contract.

## Human review observations

Passing G0/G1/G2 sources expose complete query purpose and named inputs locally; W2 choices are finite maps or CASE expressions. No passing cell required a generic query builder; `openItems` and `ownedItems` remained independently inspectable.

The per-artifact review questions (purpose, runtime-added syntax, input meaning,
client investigation, locality, and unrelated-query coupling) are recorded in
[human-review.md](./fixtures/raw-sql-normative-boundary/human-review.md).

## Inference

The strongest inference is narrower than the initial report claimed:

- Given a common task specification that already fixes named canonical SQL, NULL/value optional-filter behavior, finite sort capability, and hostile-input rejection, Safe Sort and SSSQL names did not add an observable safety outcome in two G1/G2 replicates.
- W2 supports finite reviewed **ordering** as a viable explicit exception. It does not empirically support a general rule permitting arbitrary finite runtime-selected SQL fragments.
- W1 supports complete-SQL optional predicates for the registered NULL/value semantics. It does not test omitted/`NULL`/value three-state semantics, so that application/API contract must not be inferred from this matrix.
- Named parameters remain a proposed source-level Ashiba rule, while the driver-side lowering can be small and mechanical in the registered case.
- A richer driver, metadata safety checks, or guides may still add value outside this narrow matrix. The prior [dynamic mechanism value ablation](./dynamic-mechanism-value-ablation.md) remains complementary evidence: it found Safe Sort freshness proof and SSSQL stale-coordinate proof, neither of which this construction-only matrix retests.

## Normative vs empirical distinction

The historical seven G1 rules are experiment input, not facts deduced from four workloads. The refined [proposed minimum contract](./fixtures/raw-sql-normative-boundary/proposed-minimum-contract.md) is a post-experiment design proposal that intentionally narrows the syntax exception relative to the initial Rule 4.

Keeping named parameters, canonical reviewability, local query intent, and the prohibition on runtime fragment construction is a product decision informed by evidence, not a measured universal security proof. Likewise, treating optional-input semantics and sort capability as application requirements is a design boundary: an agent cannot uniquely infer whether omitted differs from `NULL`, or which special ordering expressions an application should support, without context.

### Normative rule versus agent-help distinction

| Topic | A. Proposed Ashiba normative requirement | B. Extra agent knowledge justified by this phase? |
| --- | --- | --- |
| Complete SQL source asset | Yes: independently reviewable source remains the contract; no filesystem requirement. | No named mechanism needed. |
| Named runtime values | Yes: source-level input meaning remains explicit. | No dedicated driver tutorial required for the registered lowering case. |
| Runtime fragment construction | Prohibit runtime-added SQL fragments/clauses from input. | No special product name needed; hostile-input oracle is still required. |
| Runtime ordering | Explicit exception only for an application-specified finite reviewed ordering set. | Safe Sort name/API was not required for the tested W2 outcome. |
| Complete SQL asset selection | Allowed; selection among whole reviewed queries is not fragment construction. | No special product name needed in this matrix. |
| Optional predicates | Complete SQL semantics are sufficient for tested NULL/value behavior; subtraction remains optional tooling. | SSSQL name was not required for the tested outcome. Three-state omitted/NULL/value semantics remain untested and requirement-owned. |
| SQL style/readability | Not part of the minimum contract unless an invariant is stated. | General SQL Guidelines may help humans/agents, but this matrix showed no G2-only safety result. |

This separation prevents the observed G0/G1 success from being misread as evidence that Ashiba’s named source contract is unnecessary, while also preventing a model-memory aid from silently becoming permanent product surface.

## Threats to validity

- **Strong shared task specification:** G0/G1/G2 all received canonical named-SQL requirements, a null-guard shape, finite W2 capability, and raw-runtime-string prohibition. This likely reduced treatment contrast. The experiment measures the value of **additional Ashiba-specific guidance**, not whether an unconstrained model would invent the same rules.
- **Optional-input semantics:** W1 covers explicit `NULL` and present values only. It does not cover omitted/not-supplied versus explicit `NULL`; no SSSQL three-state conclusion is valid from this matrix.
- **Sort-capability scope:** W2 freezes `title | priority` and `asc | desc`. It does not justify a universal projection-only policy, special `CASE` semantics, or a broad finite-fragment construction rule.
- **Small sample:** two replicates per treatment are insufficient for rates or rankings.
- **Blinding:** Fresh agents shared a repository and were instructed not to inspect evaluator files, but the local setup cannot cryptographically enforce blindness.
- **Evaluator history:** initial calibration defects show why results must be read only from evaluator v6.
- **Static analysis limit:** construction detection is necessarily incomplete.
- **Runtime ablation scope:** R1/R2 tests explicit client/transaction visibility and one named-lowering responsibility but does not test metadata freshness, optional compression, safe-sort metadata, observers, or retry classification.

## Claim → evidence

| Claim | Evidence |
| --- | --- |
| Historical G1 rules were mechanism-neutral and short | [initial candidate rules](./fixtures/raw-sql-normative-boundary/initial-candidate-rules.md) |
| Final proposal narrows the runtime syntax exception | [proposed minimum contract](./fixtures/raw-sql-normative-boundary/proposed-minimum-contract.md), final decision-log entry |
| G1 can meet W1–W4 without mechanism names under the shared task spec | G1-r5/r6 runner records, assignment template, and timebox dispatch ledger |
| G2 has no observed advantage in this matrix | G1 and G2 per-cell records |
| G0 is not an unconstrained general-knowledge condition | common [assignment template](./fixtures/raw-sql-normative-boundary/assignment-template.md) and [workload spec](./fixtures/raw-sql-normative-boundary/workload-spec.md) |
| Finite ordering selection is sufficient for registered W2 | all scored W2 hostile-sort checks |
| Three-state optional-input semantics were not evaluated | W1 workload specification (`NULL` and present-value combinations only) |
| R2 can lower the registered named edge case | [`runtime-ablation.json`](./fixtures/raw-sql-normative-boundary/evidence/runtime-ablation.json), generated by `reference/runtime-ablation.mjs` |
| Dedicated adapter value remains broader than R2 | current runtime boundary plus ablation limits |

## Reproduction

Follow [reproduce.md](./fixtures/raw-sql-normative-boundary/reproduce.md). Run the reference control, then the evaluator once per scored candidate with the registered PostgreSQL connection. Do not substitute candidate self-tests for runner output.

## Decision

Do **not** adopt the historical seven G1 rules verbatim as the final minimum contract. Preserve them as the preregistered treatment and adopt the narrower post-audit proposal in [proposed-minimum-contract.md](./fixtures/raw-sql-normative-boundary/proposed-minimum-contract.md) as the current design candidate, subject to product-level human acceptance.

Keep SQL Guidelines independent and explicitly non-normative. Classify Safe Sort and SSSQL as optional named patterns/tooling, not rules, for the outcomes actually tested. Classify the thin driver as an optional adapter for named execution plus additional separate responsibilities; retain or reduce those responsibilities only after their individual value is tested.

| Required decision question | Decision in this phase |
| --- | --- |
| Long-lived minimum raw-SQL rules | Complete reviewable SQL asset; named runtime values; no runtime-added SQL fragments; explicit finite ordering exception; local query intent; complete-SQL optional semantics with subtraction only optional. See refined proposal. |
| Teach Safe Sort by name? | No for the tested W2 outcome once the application already specifies a finite sort capability. This does not define what sort capability an application must support. |
| Teach SSSQL by name? | No for the tested NULL/value optional-filter outcome. Omitted/NULL/value three-state semantics were not evaluated and must be supplied as application/API requirements when relevant. |
| Optional filters without special SQL processing? | Yes for the registered NULL/value semantics: all scored cells expressed them in complete SQL and passed. No claim is made about unregistered three-state semantics. |
| Is no additive SQL construction sufficient to eliminate injection risk? | It structurally narrows the major syntax-injection path, but is not a complete security proof. Named value binding and explicit finite ordering selection remain required in the tested boundary. |
| ORDER BY exception or general finite-syntax rule? | Retain an explicit finite ordering exception for now. W2 does not empirically justify general finite runtime SQL fragment selection. Selecting among complete reviewed SQL assets is separately allowed. |
| Keep named parameters as Ashiba contract? | Yes: a normative source-level contract; the lowerer may be application-owned. |
| Subtractive processing | Allowed technique / optional mechanical accelerator, not a normative requirement. |
| SQL Guidelines inside Ashiba Rules? | Keep independent; only promote a guideline when it is a product-owned invariant. |
| Is a thin driver required? | Not for the registered lowering case. Its remaining responsibilities require separate evidence. |
| Reviewability | Top-level design goal decomposed into complete source assets, named meaning, local-change rules, and restricted runtime syntax behavior. |
| Product Surface Reduction candidates | Safe Sort/SSSQL names and APIs, compression default, and dedicated adapter surface—candidates only; no removal in this phase. |

## Next product implications

Potential Product Surface Reduction candidates remain Safe Sort naming/API, SSSQL naming/commands/compression default, and the dedicated driver package **only after** each remaining mechanical responsibility is separately justified. Do not remove them in this phase.

The current Minimum Ashiba design candidate is layered rather than a flat list of mechanisms:

- **Raw SQL contract:** complete reviewable SQL assets, named runtime values, no runtime-added SQL fragments, finite application-specified ordering as the explicit syntax exception, local query intent, and complete SQL optional-filter semantics.
- **Application requirements:** define optional-input state semantics and the supported sort capability; those cannot be inferred uniquely from Ashiba rules.
- **Runtime contract:** mechanical inspectable named lowering and explicit application ownership of connection/transaction/policy boundaries.
- **Development-time proof:** Verify and other mechanical checks remain separate from the normative SQL contract and must justify their own retained responsibilities.
