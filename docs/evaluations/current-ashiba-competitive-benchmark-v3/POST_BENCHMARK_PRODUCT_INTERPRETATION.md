# Post-Benchmark Product Interpretation

## Status

This document records a **post-benchmark human product interpretation** of Current Ashiba Competitive Benchmark v3.

It is not preregistered evidence, does not rescore any frozen cell, does not rewrite immutable attempt evidence, and does not change Ashiba product code, Scope, or Golden Path. Where the benchmark record has been corrected in the frozen evidence pack, this document points to the corrected H-010 record while remaining explicitly a post-benchmark hypothesis note rather than a new score.

The purpose is narrower: explain what the benchmark suggests about **what Ashiba may actually be**, after separating the durable product idea from the current PostgreSQL-specific implementation.

## Executive hypothesis

The benchmark supports a stronger hypothesis than “Ashiba is a tiny named-parameter library”:

> **Ashiba may primarily be a set of Raw SQL safety rules, not a data-access framework or even necessarily a runtime library.**

Under that hypothesis, the normal form is:

```text
native database driver
+ Ashiba Raw SQL safety rules
+ application/live tests
```

Driver-specific Ashiba code exists only where a native driver lacks a capability needed to express those rules naturally.

For PostgreSQL with `pg`, meaningful named parameters are such a gap. A small pure compatibility helper may lower canonical named SQL to `$n` placeholders plus a separate ordered value collection. That helper is secondary to the rules; it is not the conceptual definition of Ashiba.

## 1. Why the native `pg` arm changes the interpretation

The benchmark's G arm is not a rule-free native-driver control.

The common assignment already requires:

- external values to remain parameterized;
- dynamic SQL syntax to be selected only from reviewed, finite, source-controlled mappings;
- the arm's normal data-access path to remain visible and testable.

The G-specific prompt further requires visible parameterized SQL and records application-owned validation and finite SQL mapping.

Therefore the measured comparison is closer to:

```text
G ≈ native pg + minimal Ashiba-style Raw SQL safety rules

A ≈ G + current Ashiba named-parameter compilation/binding policy
```

This distinction matters. A strong G result does not necessarily show that “Ashiba has no value because plain pg is enough.” It may instead show that **the rules themselves carry much of the value**, while a package adds only a narrower mechanical property.

The benchmark did not include a clean A0 arm in which an agent receives native `pg` without the Raw SQL safety rules. Consequently, it cannot yet isolate the marginal value of the rules themselves.

## 2. Proposed conceptual model

### Normal route

```text
native driver
+ Raw SQL safety rules
```

The rules should be small enough to understand as product policy rather than as a proprietary workflow.

Candidate rule set:

1. Keep SQL visible and reviewable.
2. Keep application values separate from SQL syntax through the driver boundary.
3. Never place arbitrary external text into SQL syntax.
4. If SQL syntax varies at runtime, select it only from a finite, source-controlled, reviewed set.
5. Prefer the native driver's normal execution, pool, transaction, logging, retry, and lifecycle APIs.
6. Keep schema/migration ownership explicit rather than silently duplicating it.
7. Treat PostgreSQL/database-backed application tests as behavioral authority where static tooling cannot prove semantics.

These are not all mechanical guarantees. That is intentional. AI can reliably reconstruct some implementation details from a small rule set; turning every rule into an Ashiba-owned API would recreate the maintenance surface the project has intentionally removed.

### Driver-specific compatibility route

Only when a native driver lacks a capability needed for the normal route should Ashiba add a small mechanical aid.

For `pg`:

```text
canonical SQL with meaningful names
:name

        ↓ pure deterministic lowering

native pg SQL
$1
+ separate ordered values
```

This is a compatibility function, not an execution wrapper. `pg` remains the execution owner.

For an ecosystem that already has a natural named-parameter API, the normal route may require **no Ashiba runtime package at all**.

## 3. Named parameters under this model

Named parameters remain useful, but their role changes.

They provide:

- meaningful parameter identity in review;
- less positional bookkeeping when predicates move or parameters are added/removed;
- deterministic lowering for drivers such as `pg` that expose only positional placeholders;
- pre-execution detection of genuinely missing required values when the helper performs binding.

They should not be overstated as semantic proof. Named binding does not prevent same-type wrong-value assignment or business-level cross-wiring; application/live tests remain the authority for those failures.

### Missing versus unused parameters

The benchmark suggests these should not automatically be treated as one invariant.

**Missing required parameter** is a strong mechanical error: the SQL requires a value that the application did not supply.

**Unused supplied parameter** is different. T1-A-r1 shows that strict unused rejection can reject a legitimate whole-input/statement-subset pattern. The current binder itself exposes an `allowUnusedParameters` escape hatch, which is evidence that unused rejection is a policy choice rather than an absolute safety property.

This creates a product hypothesis:

```text
missing required value → mechanical error
unused extra value     → optional strictness / application policy
```

That hypothesis should be tested rather than silently promoted into a new Scope decision.

The current Scope continues to own strict missing **and** unused rejection.
This document's question about unused values is a post-benchmark maturity and
follow-up hypothesis, not a reinterpretation of the current product contract.

## 4. PostgreSQL-first support must not become PostgreSQL-centric design

PostgreSQL is a sensible first-class support and benchmark target. It should remain heavily tested because it is important in the current ecosystem and because `pg` is the measured native-driver control.

But the product model should not be derived from `pg`'s peculiarities.

Conceptually:

```text
Normal Ashiba model:
native driver + rules

PostgreSQL support priority:
high

PostgreSQL-specific compatibility:
named parameter lowering because pg lacks a natural application-facing named API
```

If another driver already provides suitable named binding, Ashiba should prefer that native capability rather than reproduce a PostgreSQL-shaped adapter layer.

## 5. What the current benchmark does support

Subject to the separate human-review findings on terminal aggregation and sqlc version fidelity, the benchmark strongly supports several product-level observations that do not depend on a universal winner score:

- Native-driver Raw SQL can be highly capable under explicit safety rules.
- A bounded business application does not inherently require an ORM, query builder, generator, or Ashiba-owned execution layer.
- Transaction and concurrency correctness remain primarily database/application concerns rather than named-binding concerns.
- Finite dynamic SQL can be implemented with ordinary source-controlled mappings rather than a proprietary Safe Sort/query-builder subsystem.
- Architecture can remain application-owned; the data-access treatment need not dictate VSA, layered, repository, or domain structure.
- Integrated ORM/schema tooling can still provide legitimate authority where teams value schema/type/migration lifecycle ownership.
- Drizzle's strong first-live record is important measured evidence, but it is not a reason for Ashiba to recreate Drizzle's surface.

The benchmark therefore argues more strongly for **small ownership** than for feature competition.

## 6. What the benchmark does not yet prove

The following remain open:

- whether Raw SQL safety rules improve outcomes relative to a rule-free native-driver prompt;
- whether repeated maintenance erodes positional-parameter safety more often than named binding;
- whether named binding materially reduces silent defects rather than only improving reviewability;
- whether strict unused rejection prevents meaningful defects often enough to justify its friction;
- whether the same rules remain reliable across multiple native-driver ecosystems;
- long-run production defect, incident, upgrade, and human-review costs.

The current G arm cannot answer the first question because it already receives much of the Ashiba safety model.

## 7. Focused follow-up: A0 / A1 / A2

The next existence-value experiment should isolate the product layers directly rather than repeat a six-product greenfield benchmark.

### A0 — Native driver only

No Ashiba-specific Raw SQL safety rules beyond the workload's functional requirements.

Purpose: measure what the model does by default.

### A1 — Native driver + Ashiba Rules

No Ashiba package. Provide only the small Raw SQL safety rule set.

Purpose: test whether **Ashiba-as-rules** changes first-pass safety, maintenance stability, diagnosis, or review burden.

### A2 — A1 + PostgreSQL named-parameter compatibility helper

Same rules plus the tiny named-parameter lowering/binding aid required by `pg`.

Purpose: measure the helper's marginal value independently of the rules.

The normal product hypothesis is A1. A2 is a PostgreSQL compatibility extension, not a higher conceptual tier that every database must emulate.

## 8. Maintenance-focused workload

The focused study should use a successful existing Raw SQL feature and apply a sequence of realistic changes, for example:

- add/remove/rename parameters;
- reorder predicates;
- split one operation into multiple statements that consume different input subsets;
- add/remove optional filters;
- add finite sort variants;
- alter nullable filtering;
- introduce repeated parameter names;
- include lexical traps in comments/literals/dollar-quoted SQL;
- include same-type parameter positions where positional mistakes could remain syntactically valid.

After each change, run a withheld live oracle.

Useful measurements include:

- first-pass behavioral success;
- silent wrong result;
- unsafe SQL or rule violation;
- pre-DB mechanical rejection;
- DB-detected failure;
- withheld-test-detected failure;
- candidate repair count;
- product-specific glue/files/LOC;
- files and diff surface touched;
- amount of product-specific guidance required;
- whether the implementation reinvents a named-parameter parser/binder or other Ashiba mechanism.

No aggregate winner is necessary. The important question is where each safety authority lives and what durable ownership it requires.

## 9. Possible interpretation outcomes

```text
A0 ≈ A1
```

The rules themselves add little observable value under the measured AI workflow. Ashiba may be better retained as research/reference material rather than as an active product category.

```text
A1 > A0, A2 ≈ A1
```

The strongest result for the current hypothesis: **Ashiba is primarily Rules**. The `pg` helper remains optional ergonomics/review support rather than a demonstrated correctness requirement.

```text
A2 > A1
```

The rules are valuable and the named helper adds additional reproducible mechanical value for `pg`.

Even if A2 does not improve task-success rate, named parameters may still be retained as a deliberately small reviewability/maintenance feature. That claim should be stated as such rather than disguised as a universal correctness advantage.

## 10. Product direction pending that experiment

Do not add framework breadth to create an advantage that the benchmark did not observe.

In particular, this interpretation does not justify adding or restoring:

- query builders or ORM relations;
- migration lifecycle ownership;
- schema DSLs;
- DTO/mapper generation;
- transaction wrappers;
- logging/retry/pool abstractions;
- generated freshness lifecycles;
- generic CLIs;
- Safe Sort/runtime SQL composition frameworks;
- driver adapters whose only purpose is to normalize capabilities already present in the native driver.

The burden of proof remains on permanent ownership.

## Working product statement

A concise working statement for the hypothesis is:

> **Ashiba is a small set of rules for safe Raw SQL application development. Use the native driver. Keep SQL visible, keep values separate from syntax, and restrict dynamic SQL syntax to reviewed finite choices. Where a native driver lacks a capability needed to follow those rules naturally, Ashiba may provide the smallest deterministic compatibility helper.**

For PostgreSQL/`pg`, meaningful named-parameter lowering is currently the clearest example of such a helper.

This statement is a post-benchmark hypothesis, not a Scope rewrite. It should be accepted, narrowed, or rejected by the focused A0/A1/A2 maintenance evaluation rather than by adding features.
