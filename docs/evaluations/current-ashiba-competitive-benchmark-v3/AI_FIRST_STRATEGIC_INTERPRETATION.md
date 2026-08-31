# AI-First Strategic Interpretation

## Independent supplemental analysis

This Sol Ultra supplemental analysis interprets Current Ashiba Competitive
Benchmark v3 from an AI-first product-strategy perspective. It does not
rescore any benchmark cell, alter the protocol, or replace the primary report.

The operating model considered here is deliberately strict:

- humans provide specifications;
- humans write no application code;
- humans review selected code and behavior only;
- humans request diagnosis and repairs at goal level, not implementation level.

That operating model was not separately randomized in the benchmark. Claims
about it are therefore labelled **Inference** or **Hypothesis**, not
benchmark observations.

## Executive conclusion

**Observed.** The frozen primary matrix records 48 cells. Drizzle had 8/8
first-live and 8/8 corrected terminal-live passes; native `pg` had 7/8 and
7/8; Current Ashiba had 4/8 and 7/8. Prisma and Kysely also had 8/8 corrected
terminal-live passes. sqlc is not comparable as a frozen 0.1.3 arm because
six primary cells used 0.1.2. Every arm had at least one successful primary
observation. These are descriptive results for the frozen packets, model
profile, Node 24.18.0, PostgreSQL 18.6, and two replicates—not a universal
product ranking.

**Conclusion.** The benchmark permits a local comparison, but not a general
superiority claim. It does not show that Ashiba is better than plain `pg`, and
does not justify a general migration away from an established ORM or query
builder.

Ashiba has a real marginal difference from `pg`: meaningful named parameters,
deterministic placeholder lowering, and fail-closed rejection of missing or
unused values. That mechanism is positive. It also introduces one dependency
and the compile/bind concept, a small but real cost. The measured matrix did
not establish a task-success advantage over native `pg`; its net value is
therefore **conditional, not generally demonstrated**.

For an AI-first team, evaluate an ORM or query layer as:

```text
mechanical authority supplied
minus
representation, synchronization, and debugging cost introduced
```

AI lowers the importance of abstractions that mainly save human keystrokes. It
does not lower the value of deterministic contracts, database constraints,
tests, or actionable failures. In a low-human-intervention workflow, those
authorities matter more, not less.

Ashiba should not react by recreating an ORM. Its credible role is a stable,
low-context, mechanically strict boundary for teams that have intentionally
chosen visible SQL and native drivers.

> Do not leave a functioning ORM merely to adopt Ashiba. Consider moving a
> bounded path only when the incumbent is an observed source of friction, the
> application already has independent schema and live-test authority, and a
> controlled comparison reduces agent intervention and debugging cost without
> weakening required correctness.

## Evidence language

- **Observed**: directly recorded by the benchmark or current product boundary.
- **Inference**: reasoned interpretation of observed evidence.
- **Hypothesis**: requires another experiment or production evidence.

## 1. Can the benchmark determine superiority?

### It can determine a measured-condition result

| Arm | First live pass | Final live pass | Retained attempts |
| --- | ---: | ---: | ---: |
| Current Ashiba | 4/8 | 7/8 | 14 |
| Prisma 8 RC | 6/8 | 8/8 | 10 |
| sqlc TypeScript | not comparable | not comparable | six cells used 0.1.2 |
| Drizzle | 8/8 | 8/8 | 8 |
| Kysely | 6/8 | 8/8 | 10 |
| native `pg` | 7/8 | 7/8 | 10 |

**Observed.** Under these packets, Drizzle was the most consistently successful
treatment. Native `pg` and Kysely also had strong records. Ashiba was viable
across all four primary workload types, but did not lead the matrix.

It is legitimate to say that, *under the measured conditions*, Drizzle alone
had 8/8 first-live passes, while Prisma, Drizzle, and Kysely each had 8/8
corrected terminal passes. Ashiba had fewer first-live passes than native
`pg` and the same corrected terminal count. Those observations are not a
general winner claim.

### It cannot determine

The benchmark does not establish long-run production defect rates, statistical
superiority, model-independent discoverability, human-only productivity,
performance, multi-year upgrade cost, or the exact zero-human-coding model
used in this interpretation. Prisma's measured treatment was raw-SQL-dominant,
not a full generated-client comparison; the mixed-version sqlc primary record
does not support an arm-level conclusion about frozen plugin 0.1.3. Repair
causes were not normalized.

The right conclusion is two-level: measured-condition judgment is possible;
general product superiority is not established.

## 2. Ashiba versus plain `pg`

Plain `pg`, correctly used, already separates hostile values from SQL syntax.
Ashiba does not uniquely create this driver property. It adds named canonical
SQL, deterministic `$n` lowering, and pre-driver missing/unused rejection.

| Dimension | Ashiba relative to `pg` | Interpretation |
| --- | --- | --- |
| Named query readability | Positive | Names survive instead of positional bookkeeping |
| Missing/unused detection | Positive | Fails closed before DB execution |
| Hostile value separation | Mostly neutral | Both work when `pg` is correctly parameterized |
| SQL semantics/result correctness | Neutral | Both need PostgreSQL and tests |
| Dependency and concepts | Negative, small | One package plus compile/bind boundary |
| Measured primary outcome | Mixed | 7/8 corrected terminal versus `pg` 7/8; G already received Raw SQL safety rules |
| Long-run defect reduction | Unestablished | Not isolated by this benchmark |

**Inference.** Ashiba is a positive micro-mechanism and an unproven
product-level advantage. It is plausible when parameter shapes change often
and positional wiring is a real local defect class. If bindings are stable and
tests are strong, plain `pg` may be preferable because it has less to learn and
own.

The supportable claim is narrow: Ashiba supplies a deterministic
parameter-shape guard that plain `pg` does not. The benchmark does not show
that Ashiba makes AI-generated applications generally more reliable than `pg`.

## 3. Individual assessments

### Current Ashiba

**Observed.** Ashiba used visible SQL, direct compile/bind, and native `pg`; it
required no CLI, generator, static artifact, source hash, adapter, repository
abstraction, or application framework. Its first-attempt/repair sequences
included transaction, concurrency, and SQL/EXPLAIN concerns—areas that the
named-parameter primitive does not own.

**Assessment.** A viable narrow raw-SQL safety layer with a favorable ownership
boundary, but not a data layer that constrains most autonomous-agent mistakes.
It relies on high-quality application and PostgreSQL-backed tests for
transaction, concurrency, mapping, schema, and business correctness.

Best fit: SQL-first PostgreSQL or existing native-`pg` applications with
independent migrations and live tests. Poor fit: teams seeking generated result
types, relation modeling, integrated migrations, or a complete data layer.

### Prisma 8 RC

**Observed.** The frozen Prisma 8 RC arm had 6/8 first and 8/8 corrected terminal live passes.
All treatment reviews passed; six cells used qualified inline contract evidence
and two used emitted contract artifacts, with no native-`pg` bypass. Prisma 8
remains an RC, not GA/stable.

**Assessment.** Prisma can be high value when schema/contract authority,
generated types, relation modeling, and migrations are desired as a coherent
lifecycle. When essential paths are raw-SQL-dominant, it can create two
authorities: the Prisma lifecycle and canonical SQL. This benchmark does not
measure the complete generated-client lifecycle, so it cannot settle that
trade-off.

### sqlc TypeScript

**Observed, qualified.** Six sqlc cells used plugin 0.1.2 rather than frozen
0.1.3, so the record does not support a pooled sqlc 0.1.3 outcome. Core sqlc was
stable, while the TypeScript plugin was early access; the workflow owns SQL,
schema/configuration, generation, and generated TypeScript.

**Assessment.** SQL-authoritative generation is conceptually attractive for
AI-first work because it can supply parameter/result contracts. In the frozen
TypeScript workflow, plugin maturity and generator/config friction were
material. Prefer it only where generated contracts justify the lifecycle and
the target-language plugin is sufficiently mature.

### Drizzle

**Observed.** Drizzle recorded 8/8 first and final live passes without retained
additional candidate attempts.

**Assessment.** It is the strongest measured candidate for bounded AI-heavy
business work in this study. Its cost is durable schema/builder/configuration
concepts and possible SQL reconstruction during PostgreSQL-heavy debugging.
The study does not establish long-term migration, upgrade, or incident cost.

### Kysely

**Observed.** Kysely recorded 6/8 first and 8/8 corrected terminal live passes, including
successful transaction, concurrency, and Q1 observations.

**Assessment.** A plausible middle path: typed composition with less lifecycle
ownership than a full ORM. It is suitable for significant finite or open-ended
query variation. Its trade-off is builder source rather than always directly
executable canonical SQL, with complex PostgreSQL expressions often requiring
raw SQL and type assertions.

### Native `pg`

**Observed.** Native `pg` recorded 7/8 first and final live passes with no
product-specific schema, generator, CLI, or wrapper.

**Assessment.** The strongest simplicity control. It shows that ordinary SQL,
TypeScript, tests, and a native driver can accomplish most measured bounded
work. Its safety is more conventional than enforced: parameter wiring, input
shape, result interpretation, and dynamic SQL policy remain application-owned.

## 4. Is an ORM value or liability for AI?

The relevant question is not whether AI can write boilerplate. It is whether a
tool converts an important correctness property into a reliable machine check,
or merely creates another representation that the agent must synchronize.

An ORM/query builder is valuable when it offers current authoritative contracts,
generated/inferred types that catch plausible mistakes, constrained composition,
standard transactions, deterministic migration/drift checks, and actionable
errors. These can matter more when humans are not continuously reading code.

It becomes liability when critical work repeatedly escapes to raw SQL, schema
DSL and database compete as authorities, generated state creates churn,
version-specific APIs are guessed, debugging must recover hidden SQL, or tool
adoption moves architecture without equivalent proof.

**Inference.** AI lowers the value of convenience abstraction, raises the value
of deterministic verification, and raises the cost of hidden/duplicated
authority. It makes visible SQL easier to produce, but does not solve database
semantics, transaction correctness, schema drift, or test quality. ORM is
therefore neither intrinsically value nor debt.

## 5. Adoption and migration criteria for Ashiba

### Consider Ashiba only when all are true

1. Visible SQL is an intentional asset.
2. Native `pg` is an acceptable execution boundary.
3. Migration/schema lifecycle is already owned elsewhere.
4. PostgreSQL-backed tests are final authority.
5. Parameter-shape changes are frequent enough to make positional wiring a
   credible defect class.
6. The team does not expect Ashiba to provide result types, relation modeling,
   transactions, or dynamic-query composition.
7. Compile/bind remains smaller than the framework surface being avoided.

Do not adopt Ashiba merely because it is small. Prefer an alternative if the
team needs integrated schema/migrations, generated relation/result types,
extensive open-ended composition, or has weak live test coverage.

**Current verdict.** Ashiba is credible for a narrow SQL-first niche, but this
benchmark does not support actively recommending it over native `pg`, Drizzle,
or Kysely. It is worth evaluating *after* a team chooses raw SQL; it is not
evidence-backed as a reason to choose raw SQL.

### What makes switching from an ORM worthwhile?

The switch is not “ORM to Ashiba.” It is:

```text
visible SQL + native driver + application-owned mapping/transactions
+ external schema/migrations + strong live tests + Ashiba named binding
```

Switch only when all of these are established:

- the incumbent ORM is an observed constraint (raw-SQL escape dominance,
  PostgreSQL friction, generated SQL debugging, lifecycle/upgrade churn, or
  architecture conflict);
- each lost authority—migration history, drift checks, result/nullability
  validation, mapping, transaction conventions, fixtures—has an explicit
  replacement in PostgreSQL, TypeScript, tests, or a separate tool;
- a strong live-test oracle exists;
- Ashiba prevents a real local parameter defect or review/diagnosis burden;
- migration can be incremental, slice by slice; and
- a representative controlled comparison lowers total intervention while
  retaining required guarantees.

Do not switch if an ORM's schema/types/migrations work well, the work is
ordinary typed CRUD, live tests are weak, or the proposed benefit is only fewer
dependencies. If Ashiba cannot beat plain `pg` on the application's actual
parameter-maintenance burden, do not add it.

## 6. Strategic direction without feature expansion

Ashiba's strongest position is:

> a stable, low-context, mechanically strict boundary for AI-generated visible
> SQL—not a replacement application framework.

It should preserve the explainable path:

```text
visible SQL
→ compile named parameters
→ reject missing/unused values
→ bind separately
→ native driver
```

The priority is predictability, not breadth: stable API/error semantics,
precise types, concise guidance, deterministic behavior, source-level
discoverability, actionable errors, clear ownership boundaries, and easy exit.

The strategic evidence gap is not “which ORM feature should Ashiba add?” It is
whether named compilation and fail-closed binding measurably reduce autonomous
agent defects or partial-review burden compared with positional `pg`. A future
focused experiment should repeatedly add/remove/reorder parameters and change
call sites, inject missing/unused values, then measure first-pass correctness,
repair count, diagnosis clarity, files touched, and human review burden. No new
product feature is required for that test.

Ashiba can coherently remain an excellent micro-utility. If focused evidence
does not demonstrate value over `pg`, the appropriate response is to narrow
its claim, not to add framework surface until a difference appears.

## Practical decision sequence

1. Choose the desired authority: schema DSL, typed composition, SQL plus
   generation, or SQL/native driver.
2. Name an actual authority for parameter shape, result type, schema drift,
   transaction behavior, dynamic SQL, and migration history. Agent confidence
   is not proof.
3. Compare Ashiba with `pg`, not only with an ORM.
4. Run a real SQL-heavy feature and maintenance change with no human code,
   bounded review, live PostgreSQL verification, injected defect diagnosis,
   and goal-level repair instruction.
5. Decide by total intervention:

```text
human clarification + agent false starts + repair loops + review burden
+ lifecycle commands + incident diagnosis + unowned safety gaps
```

Adopt or migrate only if that total falls while required safety remains equal
or improves.

## Limitations

- Two primary replicates per arm/workload are not statistically powered.
- Repair causes and historical per-session telemetry are not normalized.
- Model familiarity is an unobserved confounder.
- The strict AI operating model here was not independently scored.
- Architecture, exit, schema-drift, and open-ended controls are non-aggregate.
- The benchmark does not measure performance, production incident frequency,
  security certification, or multi-year upgrades.

## Sources

- [Benchmark report](./REPORT.md)
- [Executive summary](./EXECUTIVE_SUMMARY.md)
- [Result matrices](./RESULT_MATRICES.md)
- [Raw results](./raw-results.json)
- [Repair analysis](./REPAIR_ANALYSIS.md)
- [Safety authority](./SAFETY_AUTHORITY.md)
- [Architecture fitness](./ARCHITECTURE_FITNESS.md)
- [Dependency surface](./DEPENDENCY_SURFACE.md)
- [Education cost](./EDUCATION_COST.md)
- [Debuggability](./DEBUGGABILITY.md)
- [Dynamic composition](./DYNAMIC_COMPOSITION.md)
- [Schema and migration context](./SCHEMA_MIGRATION_CONTEXT.md)
- [Prisma treatment adjudication](./PRISMA_TREATMENT_ADJUDICATION.md)
- [Model familiarity](./MODEL_FAMILIARITY.md)
- [Benchmark limitations](./LIMITATIONS.md)
- [Ashiba Scope](../../design/ashiba-scope.md)
- `packages/named-parameters/README.md` (repository package guidance)
