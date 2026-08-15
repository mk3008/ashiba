# SQL Tooling Competitive Benchmark

Date: 2026-08-15

This evaluation asks where Ashiba is a practical choice for LLM-led application
maintenance. It does not ask which tool has the longest feature list, and it
does not assume that raw SQL or a query builder is inherently preferable.

## Decision summary

Ashiba is a realistic alternative to Drizzle and Kysely only inside a bounded
adoption envelope: PostgreSQL-oriented TypeScript applications whose business
queries are long-lived resources, whose runtime variation is finite, and whose
team values direct database reuse and database-derived change evidence more
than arbitrary runtime composition or an integrated schema/migration ecosystem.

It is not a general replacement for either query builder. Drizzle and Kysely
are clearly preferable when joins, projections, and predicates are selected at
runtime from a large or open-ended space. Drizzle also offers a substantially
broader schema and migration workflow. sqlc is the closer conceptual comparator
for SQL ownership and compile/generate workflows, although its stable host
language support and its early-access TypeScript plugin must be evaluated
separately.

The comparison therefore should not be reduced to `Ashiba vs ORM`. The useful
decision axes are:

1. canonical query resource versus canonical TypeScript builder;
2. finite business search versus arbitrary runtime composition;
3. database-derived proof versus offline schema declarations;
4. application query tooling versus schema/migration ownership;
5. TypeScript-native runtime versus language-independent generation.

## Evidence discipline

Labels used below:

- **Observed**: reproduced in the benchmark workspace or directly inspected in
  the repository.
- **Inferred**: a conclusion from observed behavior and documented contracts.
- **Hypothesis**: plausible but not established by this benchmark.

The benchmark used one small support-ticket fixture. Timing numbers are not a
database performance contest: all tools ultimately sent SQL to the same local
PostgreSQL instance, and the fixture was too small for the sub-millisecond
differences to be decision-relevant. No production workload, multi-dialect
application, or long-running migration was measured.

## Fixed versions and official sources

| Component | Version used | Evidence |
|---|---:|---|
| Ashiba | `7d6d384aa262dea34ed76d4300a368f8316de41c` | repository `main` after the Verification Value Audit merge |
| sqlc | `1.31.1` | downloaded official release asset and matched its published SHA-256 |
| sqlc TypeScript plugin | `0.1.3` | official plugin configuration; the official repository calls it early access |
| Drizzle ORM | `0.45.2` | pinned npm package |
| Drizzle Kit | `0.31.10` | pinned npm package |
| Kysely | `0.29.5` | pinned npm package |
| PostgreSQL | `18.1 (Debian 18.1-1.pgdg13+2)` | `select version()` against the benchmark server |

Official references:

- [Drizzle releases](https://github.com/drizzle-team/drizzle-orm/releases),
  [dynamic query building](https://orm.drizzle.team/docs/dynamic-query-building),
  [`sql` templates](https://orm.drizzle.team/docs/sql), and
  [migration approaches](https://orm.drizzle.team/docs/migrations)
- [Kysely releases](https://github.com/kysely-org/kysely/releases),
  [documentation](https://www.kysely.dev/),
  [DynamicModule API](https://kysely-org.github.io/kysely-apidoc/classes/DynamicModule.html),
  and [`sql` API](https://kysely-org.github.io/kysely-apidoc/interfaces/Sql.html)
- [sqlc releases](https://github.com/sqlc-dev/sqlc/releases),
  [`generate`](https://docs.sqlc.dev/en/latest/howto/generate.html),
  [CI/CD](https://docs.sqlc.dev/en/stable/howto/ci-cd.html),
  [language support](https://docs.sqlc.dev/en/stable/reference/language-support.html),
  [configuration](https://docs.sqlc.dev/en/latest/reference/config.html), and
  the [official TypeScript plugin](https://github.com/sqlc-dev/sqlc-gen-typescript)

## Shared requirement and fixture

The same schema and data were used for Ashiba, sqlc, Drizzle, Kysely, and direct
`pg` execution. The query included:

- three CTEs;
- a window function and aggregate;
- `CASE` behavior through a PostgreSQL function;
- `NULLIF`, JSONB construction, arrays, joins, and PostgreSQL casts;
- optional status and priority filters; and
- pagination and deterministic ordering.

The schema included an enum, a domain, a function, a view, JSONB, arrays,
nullable joined values, and a `bigint` value above JavaScript's safe integer
range (`9007199254740993`).

The direct SQL, Drizzle builder, and Kysely builder returned the same normalized
row hash. Their `EXPLAIN (FORMAT JSON, ANALYZE FALSE)` root node was `Limit` in
all three cases.

| Source | Compiled SQL bytes | Median of 5 executions | Observed range |
|---|---:|---:|---:|
| canonical SQL / generic `pg` | 2,120 | 1.654 ms | 1.471–25.402 ms |
| Drizzle builder | 1,644 | 1.375 ms | 1.058–1.456 ms |
| Kysely builder | 1,470 | 1.121 ms | 1.105–1.273 ms |

The first direct execution was cold. The fixture is too small and five samples
are too few to claim a tool-level performance difference.

## Parameter and result safety

### Observed negative checks

| Case | Ashiba | sqlc TypeScript | Drizzle | Kysely |
|---|---|---|---|---|
| invalid status parameter | rejected before runtime by DB-derived contract | rejected by TypeScript | rejected by TypeScript | rejected by TypeScript |
| `bigint` result assigned to `number` | rejected before runtime by driver contract | rejected by TypeScript | rejected by TypeScript | rejected by TypeScript |
| nullable joined text assigned to `string` | rejected by Ashiba contract check | **not rejected** by generated TypeScript | represented as nullable when declared correctly | represented as nullable when declared correctly |
| text array declared as `number[]` | rejected by Ashiba contract check | DB-backed analysis generated `string[]` | schema/type expression can represent `string[]` | database type declaration can represent `string[]` |
| JSONB asserted as an application DTO | rejected because database parsing proves only `unknown` | generated broad JSON representation | `sql<T>`/schema annotations can assert a type without runtime proof | `sql<T>` can assert a type without runtime proof |
| enum | PostgreSQL-derived literal union | DB-backed plugin generation produced the DB type | schema declaration supplies the union | application database type supplies the union |

Drizzle and Kysely caught the tested TypeScript mistakes at compile time, but
their raw expression generic is an assertion. It is useful as an escape hatch,
not database proof. Ashiba's optional live contract distinguished database type,
inferred/unknown nullability, and node-postgres representation. That caught the
unsafe bigint boundary and refused to invent a JSON DTO.

sqlc's DB-backed analyzer improved an initially wrong array type, but the
generated TypeScript still typed a nullable left-joined expression as
non-nullable. Runtime execution returned `null` for two rows. This is an
observed false negative for plugin version 0.1.3, not a claim that sqlc core or
its stable Go generators are generally unsound.

### Type ownership trade-off

- **Inferred:** Drizzle/Kysely provide the fastest feedback when the application
  schema declaration is current, because ordinary TypeScript compilation sees
  the query shape without a database.
- **Inferred:** Ashiba provides stronger evidence for PostgreSQL/driver details
  when its optional live gate runs, but offline analysis remains deliberately
  incomplete.
- **Observed:** Ashiba initially rejected a valid string-literal parameter
  subset and single-quoted literal union. The measured improvement later in this
  document removed that false positive.

## Schema change maintenance

The benchmark cloned the database and renamed `bench.tickets.priority` to
`urgency` without changing application sources.

| Tool/workflow | Detection stage | Result |
|---|---|---|
| plain SQL, Drizzle runtime, Kysely runtime | query execution | PostgreSQL `42703` |
| Drizzle/Kysely offline TypeScript check | compile time | passed; neither check inspected the live database |
| Drizzle Kit database-first `pull` | explicit schema pull | succeeded and generated a schema containing `urgency`; application adoption/diff remained required |
| sqlc DB-backed `generate` | before application runtime | failed at the removed column |
| Ashiba PostgreSQL contract | before application runtime | failed at the removed column |

Ashiba's live SQL Resource suite additionally exercised at least 19 affected
schema scenarios. Observed classifications included:

- execution-breaking: renamed/dropped referenced objects;
- compatible: `smallint` to `integer`, array element widening, enum addition,
  adding `NOT NULL`, and behavior protected by an explicit cast;
- contract-changed: `integer` to `bigint`, dropping `NOT NULL`, aggregate or
  function return changes, enum rename, JSON to JSONB, UUID incompatibility,
  and parameter integer to bigint;
- needs-review: view join-semantics and domain-constraint changes.

This is an Ashiba advantage over unchanged offline builder declarations, not an
advantage over the combination of a builder and an explicit database schema
diff/check. Drizzle Kit has a much broader schema/migration workflow. Kysely core
intentionally does not provide an equivalent integrated introspection surface.

## Dynamic query construction

### Finite business search

The canonical SQL represented optional status and priority predicates,
pagination, and a finite sort policy. Ashiba removed null branches and rendered
only allow-listed sort fragments. The generated PostgreSQL executed correctly
for absent and present filters. Drizzle accumulated typed conditions; Kysely
conditionally extended its builder. All approaches met this finite requirement.

Ashiba's benefit here is reviewable complete SQL plus a small finite runtime
policy. It is not arbitrary composition. The cost is parser-derived metadata
and generated verification artifacts.

### Arbitrary runtime composition

Four combinations were executed for Drizzle and Kysely:

1. base projection only;
2. status plus conditional customer join/projection;
3. priority plus conditional tag join/projection; and
4. both filters, joins, and projections.

Both libraries type-checked and executed all four combinations. Row counts and
normalized results matched in every case. Parameter counts varied correctly
from zero to two.

Ashiba has no equivalent general mechanism by design. It can keep a finite set
of separate canonical queries or finite subtractive branches, but a generic
dynamic join/projection system would introduce a query-builder/runtime-AST
framework and weaken its reason to exist.

**Classification:** Drizzle/Kysely clearly preferable; structural and
intentional Ashiba gap. This is especially important for user-designed report
builders, arbitrary analytics UIs, and open-ended reusable query composition.

## Complex SQL and debugging

All three TypeScript application approaches expressed the shared complex query.
The practical differences appeared in the change and investigation loop:

- Ashiba's `.sql` was directly available for database-client execution,
  `EXPLAIN`, edit, and re-snapshot. The live portability test executed it with a
  generic node-postgres consumer, obtained an `EXPLAIN`, changed the canonical
  limit, refreshed, and observed one returned row.
- sqlc retained SQL as the authoring format, but its normal named-parameter
  macros (`sqlc.arg`/`sqlc.narg`) were not directly executable by PostgreSQL.
  Positional `$1` input avoided that issue but generated unusable empty
  TypeScript parameter names in this query. The normal workflow therefore
  required either macro preprocessing or using generated SQL.
- Drizzle and Kysely compiled to inspectable SQL. The benchmark executed those
  extracted strings with generic `pg`, proving that extraction is possible.
  Edits to extracted SQL do not round-trip to the builder source.

One concrete Drizzle debugging event occurred: a raw expression selected into a
CTE needed an explicit `.as(...)` alias for the separately extracted SQL path.
The first extraction produced a property/SQL-alias mismatch. Adding the alias
fixed it. This is extraction friction, not evidence that normal Drizzle result
mapping is incorrect.

**Observed:** canonical executable SQL removed the compile/extract step and the
round-trip-to-builder step during the measured database investigation.
**Inferred:** that matters most when incidents are investigated primarily in
database tools or by people/agents outside the TypeScript application context.

## SQL resource portability and exit cost

| Tool | Business SQL before extraction | Generic DB execution | Edit round-trip | Removal implication |
|---|---|---|---|---|
| Ashiba | canonical `.sql`; derived positional resource | direct through derived resource | edit canonical `.sql`, refresh | SQL remains; replace thin execution boundary and remove packages |
| sqlc | canonical SQL with sqlc macros in normal named workflow | preprocess macros or use generated SQL | return changes to macro-bearing source and regenerate | query meaning remains, generated calls/types must be replaced |
| Drizzle | TypeScript builder | compile/extract first | extracted SQL edits do not update builder | freeze/rewrite SQL and parameter/result boundary |
| Kysely | TypeScript builder | compile/extract first | extracted SQL edits do not update builder | freeze/rewrite SQL and parameter/result boundary |

The benchmark successfully ran Ashiba's derived resource and both builder
extractions through generic `pg`. Thus builder removal does not lose query
semantics if compiled SQL is frozen first. The difference is ownership and
future editability: Ashiba preserves the business source in its original form;
the builders require a one-way extraction or rewrite.

No complete application migration was performed, so exact file counts and
agent effort for library removal remain **not measured**. Claims that raw SQL
always makes migration cheap are therefore not proven. Application-specific
transaction abstractions, result mapping, observability, and tests still have
to be replaced.

## Verification surface

For the benchmark query before the improvement loop, Ashiba produced:

| Artifact | Bytes |
|---|---:|
| `postgres.contract.json` | 21,973 |
| `query.meta.ts` | 36,643 |
| `query.postgres.sql` | 2,146 |
| `query.resource.json` | 22,878 |
| `query.sql.ts` | 2,395 |
| fleet snapshot | 28,554 |

This is materially more persistent evidence than a Drizzle/Kysely query and
schema declaration, and it creates stale-artifact and agent-reading risk. sqlc
also owns generated artifacts: the TypeScript query output was 3,471 bytes;
the Go package emitted 5,912 bytes across DB, model, and query files in this
fixture.

Ashiba's artifacts do different jobs, so byte count alone is not a defect. The
full live contract and portability snapshot are development evidence. However,
embedding the same full live contract in runtime metadata was redundant and
measurably costly. That became improvement 2.

## LLM maintenance implications

The separate [Fresh Agent A/B evaluation](./ai-maintenance-ab.md) measures the
effect of Ashiba's Verification Value Audit. This four-way fixture adds the
following evidence:

- compiler errors in Drizzle/Kysely provided immediate, deterministic repair
  feedback for the tested wrong parameter and bigint result types;
- Ashiba's live contract found database/driver facts that a stale offline
  declaration did not, but required the database command;
- canonical SQL made the database-only investigation loop shorter and kept the
  agent's edit in the source of truth;
- arbitrary dynamic composition was direct in both builders and would require
  architectural invention in Ashiba; and
- more generated evidence is not automatically better for an agent. Evidence
  should remain only when it prevents a demonstrated defect or uncertainty.

**Hypothesis:** LLMs reduce the value of fluent syntax as a typing convenience,
but not the value of compiler feedback, database-derived contracts, finite safe
composition, or direct reproducibility. This benchmark supports the latter
mechanisms; it does not measure model training familiarity or token efficiency
across the four tool syntaxes.

## sqlc lessons

| sqlc mechanism | Ashiba decision |
|---|---|
| SQL as reviewed source plus explicit generation | already solved differently |
| DB-backed query analysis that fails before runtime | adopt in spirit; Ashiba's optional PostgreSQL contract already supplies it |
| `generate`/`vet` as deterministic CI commands | adapt; keep Ashiba's selective gates explicit |
| stable generated package ownership | useful in stable host languages; TypeScript plugin maturity prevents treating the tested plugin as production-equivalent |
| macro-based named parameters | not useful for Ashiba's external SQL portability unless a derived executable resource is retained |
| migration verification against schema changes | adapt through SQL Resource fleet comparison, without taking migration deployment ownership |
| generated nullable result inference observed here | do not copy; preserve unknown rather than assert non-null |

sqlc was clearly strong at DB-backed pre-runtime failure and language-neutral
SQL ownership. Ashiba should not hide this. Ashiba's distinctive adaptation is
to keep named canonical SQL plus a derived executable PostgreSQL resource and
portable type/dependency snapshot rather than own a host-language generated
data-access package.

## Measured improvement loop

Only two changes were retained.

### 1. Accept safe TypeScript input subsets

**Baseline observation:** the correct query used a PostgreSQL-proven string
contract, while the application parameter type was a narrower literal union
written with single quotes. The gate exited 1 with three false mismatches.

**Change:** compare top-level union members directionally. String, numeric, and
boolean literals are accepted when the database/driver input type covers them;
broader inputs, wrong literals, `unknown`, and an extra `null` remain rejected.
Single-quoted literals are normalized for comparison.

**Rerun:** the identical project and database changed from exit 1 to exit 0.
Focused negative tests still rejected a broader `string` against an enum, an
unknown enum member, and nullable input against a non-null contract.

### 2. Keep the full PostgreSQL contract out of runtime metadata

**Baseline observation:** `query.meta.ts` embedded the full 21,973-byte
development contract already stored in `postgres.contract.json`.

**Change:** runtime metadata now retains only contract version, source hash, and
driver profile—the fields the adapter actually consumes. The complete contract
remains the authoritative development and review artifact.

**Rerun:** `query.meta.ts` fell from 36,643 to 9,750 bytes, a 73.4% reduction.
The query-local generated set fell from 86,035 to 59,142 bytes, a 31.3%
reduction. The complete 21,973-byte JSON remained intact. The PostgreSQL adapter
live suite passed all 3 tests with the reduced runtime metadata.

Both changes preserve canonical SQL, avoid runtime AST/query-building behavior,
and replace avoidable agent reasoning or reading with smaller deterministic
contracts.

## Gap classification

| Gap | Classification | Reason |
|---|---|---|
| arbitrary dynamic joins/projections | structural and intentional | fixing it would create the query builder Ashiba excludes |
| migration deployment and schema ecosystem | ecosystem gap | valuable, but ownership would expand Ashiba beyond application SQL tooling |
| multi-dialect DB proof | ecosystem/unproven | current empirical evidence is PostgreSQL-specific |
| offline inference below builder precision | structural with fixable cases | unknown must stay safe; isolated parser errors can be improved without pretending full proof |
| literal-union false mismatch | fixable, fixed | measured false repair pressure with a small deterministic solution |
| duplicated runtime contract bytes | fixable, fixed | no runtime consumer needed the duplicated detail |
| inline object-type parsing limitation | fixable but not selected | observed regex limitation; lower measured ROI than the two retained changes |
| general ORM entity/relation/UoW behavior | not worth fixing | conflicts with Ashiba's boundary and was not required by this benchmark |

## Where each tool is preferable

### Ashiba clearly preferable

- PostgreSQL-centric, SQL-first applications where the same query must be used
  in application code, database investigation, `EXPLAIN`, and another client;
- finite business searches that benefit from complete reviewable SQL plus
  allow-listed runtime behavior;
- teams that want optional database/driver proof and fleet-level compatibility
  evidence without giving runtime ownership to an ORM; and
- systems where future removal of the application query tool should leave the
  business query source intact.

### sqlc clearly preferable

- stable supported host-language projects that want generated data-access code
  from SQL;
- teams comfortable with a generator-owned package and an explicit
  compile/generate/vet workflow; and
- DB-backed pre-runtime analysis where sqlc's chosen language generator has
  mature semantics.

For TypeScript specifically, plugin 0.1.3's early-access status and the observed
nullability miss are material caveats.

### Drizzle clearly preferable

- TypeScript applications wanting one integrated schema/query/migration
  ecosystem;
- database-first pull or code-first schema workflows; and
- dynamic query shapes where schema declarations and builder inference should
  remain in the same library.

The trade is canonical TypeScript ownership: standalone editable business SQL
must be extracted or rewritten, and raw expression types can be assertions.

### Kysely clearly preferable

- TypeScript applications prioritizing a focused, strongly typed builder;
- reusable composition and open-ended dynamic joins/projections; and
- teams that want to bring their own migration/introspection choices rather
  than adopt an ORM-style schema ecosystem.

The trade is again builder ownership rather than independently editable SQL,
plus application responsibility for database type declarations and drift.

### Roughly equivalent in this fixture

- correct execution of the shared complex PostgreSQL query;
- ordinary optional predicates and pagination; and
- the ability to inspect and `EXPLAIN` final SQL once builder SQL is compiled.

### Unknown or not measured

- production performance and plan stability;
- exact full-application removal effort;
- multi-dialect portability;
- large-team onboarding and multi-year ownership cost;
- equivalent Fresh Agent maintenance runs across all four tools; and
- model/token efficiency for authoring each syntax.

## Proven and unproven raw SQL advantages

### Proven here

- canonical executable SQL eliminated builder extraction during database
  investigation;
- a database edit/`EXPLAIN` loop returned directly to the application source of
  truth instead of requiring a builder round-trip;
- SQL Resource comparison evaluated a schema change over the canonical fleet;
  and
- removing Ashiba can preserve the business SQL source and derived positional
  resource.

These are not all Ashiba inventions. Direct execution and `EXPLAIN` are
PostgreSQL/raw-SQL values; Ashiba's contribution is the contract, portability,
finite-composition, and fleet workflow around them.

### Not proven here

- that raw SQL is faster;
- that LLMs produce fewer semantic SQL defects with raw SQL;
- that raw SQL always has lower total maintenance cost;
- that removal of Ashiba is cheap for every application; or
- that parser degradation is preferable to builder compile errors for all query
  classes.

## Adoption recommendation

Choose Ashiba when executable SQL is a durable product resource, runtime
variation is finite, PostgreSQL-derived evidence is worth an explicit
development gate, and the team accepts a smaller ecosystem and more selective
generated evidence.

Do not choose Ashiba for arbitrary analytics/query UIs, open-ended relation
composition, an ORM entity model, or when schema/migration ownership and
cross-dialect support should come from the same library. Choose Drizzle for the
integrated TypeScript schema ecosystem, Kysely for a focused composable typed
builder, or a mature sqlc host-language workflow for generated SQL access.

The measured answer is therefore: Ashiba has become a realistic alternative to
an ORM/query builder in a specific SQL-resource-centric PostgreSQL segment. It
has not become a general replacement. The principal wall is not missing polish;
it is the intentionally unsupported space of arbitrary runtime query shape,
followed by schema/migration ecosystem breadth and still-unproven multi-dialect
behavior.
