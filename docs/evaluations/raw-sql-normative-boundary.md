# Raw SQL normative boundary & runtime minimality audit

## Executive summary

**Decision status: partial, evidence-backed for the narrow PostgreSQL workloads.** The smallest durable candidate contract is seven mechanism-neutral rules: reviewable complete SQL assets; named runtime values; no open-ended runtime syntax; finite reviewed syntax selection; local query purpose; mechanical inspectable named-to-positional lowering; and explicit application-owned policy/transaction boundaries.

The scored Fresh-Agent matrix is G0 2/2, G1 2/2, G2 2/2 strict runner passes. Every scored treatment produced implementations satisfying W1–W4, and G1 was stable in this small sample without named Safe Sort or SSSQL instruction. This weakens the claim that those names are mandatory agent knowledge; it does not prove they have no ergonomic value. R1 and R2 emitted identical positional SQL and values for the registered cast/string/comment/repetition edge case and both passed PostgreSQL. That proves a dedicated driver is not necessary for this one execution responsibility, not that all existing driver responsibilities are unnecessary.

## Acceptance attainment

| Acceptance item | Status | Evidence | Gap |
| --- | --- | --- | --- |
| Current-surface inventory | done | Source-linked [inventory](./fixtures/raw-sql-normative-boundary/responsibility-inventory.md). | Product classification remains a proposed decision. |
| Normative versus agent-help separation | done | “Normative rule versus agent-help distinction” below and G0/G1/G2 matrix. | Two replicates do not estimate population rates. |
| 5–10 mechanism-neutral candidate rules | done | Seven [initial candidate rules](./fixtures/raw-sql-normative-boundary/initial-candidate-rules.md). | Human acceptance is pending. |
| Same-profile/timebox guidance experiment | done | v6 runner records and [dispatch ledger](./fixtures/raw-sql-normative-boundary/evidence/dispatch-ledger.md). | Shared filesystem prevents cryptographic blinding. |
| W1–W4 deterministic PostgreSQL oracle | done | Workload specification, evaluator, and six strict-pass records. | Static construction scan is intentionally incomplete. |
| R1/R2 runtime ablation | partial | Lowering and explicit transaction-client controls in [runtime evidence](./fixtures/raw-sql-normative-boundary/evidence/runtime-ablation.json). | It does not replace testing every adapter responsibility. |
| Human reviewability record | done | Per-candidate [human review record](./fixtures/raw-sql-normative-boundary/human-review.md). | It is a structured review, not proof of absence of defects. |
| Durable protocol and adaptive history | done | Manifest, decision log, candidate artifacts, evaluator, results verifier, and reproduction procedure. | Prior historical evaluations retain their own documented evidence limits. |
| Product-source restraint | done | This phase adds evaluation documentation and evidence only. | Product reduction remains a later decision. |

## Question

What is the minimal long-lived Ashiba contract for raw SQL; which current surfaces are rules, general guidance, recipes, mechanical tooling, application ownership, historical/optional material, or removal candidates; and does that contract require Safe Sort, SSSQL, a dedicated thin driver, or detailed guidance?

## Why this matters

Product mechanism names can be mistaken for requirements. A reviewer must be able to identify what Ashiba requires, what is merely a good SQL practice or implementation recipe, and what runtime must not hide.

## Initial candidate model

The preregistered seven rules and rationale are in [initial-candidate-rules.md](./fixtures/raw-sql-normative-boundary/initial-candidate-rules.md). They retain named parameters as an Ashiba source-level contract even though PostgreSQL can execute positional parameters.

## Scope / non-scope

This phase changes only evaluation evidence and documentation. It does not remove product APIs, alter generated application code, or generalize the result beyond the pinned Node/PostgreSQL host. It is not a productivity benchmark or proof about MySQL/SQL Server.

## Existing responsibility inventory

The full source-linked inventory—including Verify, scaffold/generated metadata,
the Constitution candidate, and prior evaluations—is
[responsibility-inventory.md](./fixtures/raw-sql-normative-boundary/responsibility-inventory.md).

| Surface | Provisional classification | Evidence and interpretation |
| --- | --- | --- |
| Canonical `.sql`, visible source, generated snapshots | Normative Rule | Runtime boundary and README identify `.sql` as canonical and snapshots as generated. |
| Named parameters | Normative Rule | Keeps input meaning visible in source; positional lowering is execution mechanics. |
| No additive SQL from unbounded runtime input | Normative Rule | The injection boundary, independent of a specific API. |
| Finite reviewed syntax variation | Normative Rule | Generalizes dynamic ordering without making `ORDER BY` a special magic case. |
| Query-local purpose/reviewability | Normative Rule | Top-level design goal operationalized as local source assets and intentional sharing only. |
| Optional predicates in SQL | Pattern / Recipe | SSSQL is an ordinary valid-SQL expression of semantics. |
| SSSQL compression | Mechanical Tooling / optional accelerator | Metadata-backed removal can improve a query shape but is not required by W1 semantics. |
| Safe Sort | Pattern / optional tooling | It is one finite-selection implementation; W2 allows map, switch, CASE, or separate SQL. |
| SQL readability, comments, client compatibility, duplication policy | SQL Guideline | Useful independently of Ashiba; not all are enforcement rules. |
| PostgreSQL named binder | Mechanical Tooling | R1 proves a comprehensive implementation; R2 proves the narrow lowering can be application-owned. |
| Pool, transaction, retries, business policy | Application-owned | Current runtime boundary explicitly keeps them visible to the application. |
| Generated metadata, source hash rejection | Mechanical Tooling | Deterministic support/proof for optional rewrite and stale-artifact safety, not the normative goal itself. |

## Environment

Baseline was `origin/main` `d130dfe`. Runs used Node 22.14.0, the locally running `postgres:18` Docker container, node-postgres, and runner-created/drop-cleaned nonce schemas. The container's persisted login did not match its initial environment setting; a temporary role limited to `CONNECT, CREATE` was created for the evaluator and removed after the run. This is an environment fact, not product evidence.

## Treatments

G0 supplied PostgreSQL general knowledge only. G1 supplied only the seven candidate rules. G2 supplied current runtime-boundary, SSSQL, and Safe Sort guidance. Each scored cell used the same worker profile, inherited permissions, packet, and a recorded 20-minute deadline; the [dispatch ledger](./fixtures/raw-sql-normative-boundary/evidence/dispatch-ledger.md) records completion before deadline. The only treatment difference was guidance.

## Workloads

W1 optional filters, W2 finite runtime ordering, W3 similar-but-distinct queries, and W4 named-lowering lexical edge cases are frozen in [workload-spec.md](./fixtures/raw-sql-normative-boundary/workload-spec.md).

## Evaluator / oracle

The runner owns fixture data, hostile input, nonce schema, callable invocation, source checks, and JSON records. It checks functional results, hostile parameter and sort paths, optional combinations, named source assets, lexical binding edge cases, and a narrow direct-driver construction signal. It cannot prove absence of every construction path; see [evaluator specification](./fixtures/raw-sql-normative-boundary/evaluator-spec.md).

## Adaptive decision log

The first dispatch and multiple evaluator iterations were calibration, not scored. The durable [decision log](./fixtures/raw-sql-normative-boundary/decision-log.md) records assignment-interface ambiguity, unregistered W4 assertions, finite-manifest traversal, and the missing timebox record before each protocol change. No results from different evaluator versions are combined.

## Run matrix

| Treatment | Scored cells | Strict PostgreSQL pass | Reading |
| --- | ---: | ---: | --- |
| G0 | g0-r5, g0-r6 | 2 / 2 | General knowledge produced two complete passes within the registered timebox. |
| G1 | g1-r5, g1-r6 | 2 / 2 | Candidate rules alone produced two complete passes within the registered timebox. |
| G2 | g2-r3, g2-r4 | 2 / 2 | Current guidance also produced two complete passes within the registered timebox. |
| R1 | current adapter compiler | pass | Correct named lowering and PostgreSQL result for the registered edge case. |
| R2 | application-owned lowering | pass | Same emitted SQL/values and PostgreSQL result for that edge case. |

The authoritative per-cell records are [results.json](./fixtures/raw-sql-normative-boundary/evidence/results.json); superseded calibration records remain under `evidence/calibration/`.

## Observed

All scored cells passed hostile sort rejection, hostile value handling, W1 combinations, W3 locality, and W4's registered lexical/result assertions. The G1 passes did not require Safe Sort or SSSQL names. G2 used those names but did not produce a distinct observable safety outcome in two replicates.

## Human review observations

Passing G0/G1/G2 sources expose complete query purpose and named inputs locally; W2 choices are finite maps or CASE expressions. No passing cell required a generic query builder; `openItems` and `ownedItems` remained independently inspectable.

The per-artifact review questions (purpose, runtime-added syntax, input meaning,
client investigation, locality, and unrelated-query coupling) are recorded in
[human-review.md](./fixtures/raw-sql-normative-boundary/human-review.md).

## Inference

The evidence supports `bounded syntax variation`, not a special `ORDER BY` exception: W2 remained safe with more than one implementation. It supports optional predicates as normal complete SQL rather than a mandatory runtime rewrite. It supports named parameters as a useful source-level Ashiba rule, while showing that the driver-side lowering can be small and mechanical. It does not establish that a richer driver, metadata safety checks, or guides lack value outside this narrow matrix. The prior [dynamic mechanism value ablation](./dynamic-mechanism-value-ablation.md) remains relevant complementary evidence: it found Safe Sort freshness proof and SSSQL stale-coordinate proof, neither of which this construction-only matrix retests.

## Normative vs empirical distinction

The seven rules are a proposed design decision, not facts deduced from four workloads. The pass matrix is empirical evidence only about the pinned prompts, model profile, and fixture. Keeping named parameters and canonical reviewability is a product choice informed by the evidence, not a measured security proof.

### Normative rule versus agent-help distinction

| Topic | A. Proposed Ashiba normative requirement | B. Extra agent knowledge justified by this phase? |
| --- | --- | --- |
| Canonical complete SQL | Yes: independently reviewable source remains the contract. | No named mechanism needed. |
| Named runtime values | Yes: source-level input meaning remains explicit. | No dedicated driver tutorial required for the registered lowering case. |
| Open-ended syntax construction | No: prohibit it. | No special product name needed; hostile-input oracle is still required. |
| Finite variation | Yes when runtime selects syntax. | Safe Sort is optional shorthand/tooling, not required instruction. |
| Optional predicates | No mandatory mechanism; complete SQL semantics are required when the product has optional filtering. | SSSQL is optional shorthand/recipe. Existing evidence supports its separate stale-metadata proof, not mandatory construction guidance. |
| SQL style/readability | Not part of the minimum contract unless an invariant is stated. | General SQL Guidelines may help humans/agents, but this matrix showed no G2-only safety result. |

This separation prevents the observed G0/G1 success from being misread as evidence that Ashiba’s named source contract is unnecessary, while also preventing a model-memory aid from silently becoming permanent product surface.

## Threats to validity

Two replicates per treatment are insufficient for rates or rankings. Fresh agents shared a repository and were instructed not to inspect evaluator files, but the local setup cannot cryptographically enforce blindness. The initial calibration defects show why results must be read only from evaluator v6. Static construction detection is necessarily incomplete. R1/R2 tests explicit client/transaction visibility but does not test metadata freshness, optional compression, safe-sort metadata, observers, or retry classification.

## Claim → evidence

| Claim | Evidence |
| --- | --- |
| Candidate rules are mechanism-neutral and short | initial candidate rules; inventory above |
| G1 can meet W1–W4 without mechanism names | G1-r5/r6 runner records and timebox dispatch ledger |
| G2 has no observed advantage in this matrix | G1 and G2 per-cell records |
| Finite syntax selection is sufficient for W2 | all scored W2 hostile-sort checks |
| R2 can lower the registered named edge case | [`runtime-ablation.json`](./fixtures/raw-sql-normative-boundary/evidence/runtime-ablation.json), generated by `reference/runtime-ablation.mjs` |
| Dedicated adapter value remains broader than R2 | current runtime boundary plus ablation limits |

## Reproduction

Follow [reproduce.md](./fixtures/raw-sql-normative-boundary/reproduce.md). Run the reference control, then the evaluator once per scored candidate with the registered PostgreSQL connection. Do not substitute candidate self-tests for runner output.

## Decision

Adopt the seven candidate rules as the proposed Minimum Ashiba contract, subject to human acceptance. Keep SQL Guidelines independent and explicitly non-normative. Classify Safe Sort and SSSQL as optional named patterns/tooling, not rules. Classify the thin driver as an optional adapter for named execution plus additional separate responsibilities; retain or reduce those responsibilities only after their individual value is tested.

| Required decision question | Decision in this phase |
| --- | --- |
| Long-lived minimum rules | The seven candidate rules; see initial candidate rules. |
| Teach Safe Sort by name? | No for the tested safety outcome; retain only as optional shorthand/tooling pending separate ergonomic evidence. |
| Teach SSSQL by name? | No for the tested optional-filter outcome; retain as optional shorthand/recipe pending separate performance evidence. |
| Optional filters without special SQL processing? | Yes, all scored cells expressed them in complete SQL and passed. |
| Is no additive SQL construction sufficient to eliminate injection risk? | It structurally narrows the major syntax-injection path, but is not a complete security proof. Named value binding and finite reviewed variation remain required. |
| ORDER BY exception or general rule? | Use the general bounded-syntax-variation rule. |
| Keep named parameters as Ashiba contract? | Yes: a normative source-level contract; the lowerer may be application-owned. |
| Subtractive processing | Allowed technique / optional mechanical accelerator, not a normative rule. |
| SQL Guidelines inside Ashiba Rules? | Keep independent; only promote a guideline when it is a product-owned invariant. |
| Is a thin driver required? | Not for the registered lowering case. Its remaining responsibilities require separate evidence. |
| Reviewability | Top-level design goal decomposed into complete source assets, bounded syntax, named meaning, and local-change rules. |
| Product Surface Reduction candidates | Safe Sort/SSSQL names and APIs, compression default, and dedicated adapter surface—candidates only; no removal in this phase. |

## Next product implications

Potential Product Surface Reduction candidates: Safe Sort naming/API, SSSQL naming/commands/compression default, and the dedicated driver package **only after** each remaining mechanical responsibility is separately justified. Do not remove them in this phase. Minimum Ashiba is: visible complete SQL, named inputs, no open-ended runtime syntax, finite reviewed variation, local reviewability, mechanical inspectable lowering, explicit application ownership, and development-time verification around those boundaries.
