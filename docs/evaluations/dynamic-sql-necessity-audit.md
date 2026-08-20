---
title: Dynamic SQL Necessity Audit
---

# Dynamic SQL Necessity Audit

## Decision record

**Overall status: done as an evidence-bounded audit; no product prototype was
adopted.**

The question is not whether a library exposes a dynamic API. It is which
business requirement needs runtime SQL syntax at all, and what the least
powerful adequate mechanism is: value binding, subtraction, finite
closed-world construction, separate canonical SQL, or an open-ended builder.
This audit actively includes cases where an open-ended builder is the better
fit. It is not a prevalence survey and does not claim a universal winner.

Baseline: `c116761957b6b6ac89e7f7db49961bef87940822` (PR #52 merge). The
isolated worktree was clean before audit artifacts. The first `pnpm verify`
attempt was blocked by the worktree dependency-preparation permission; after a
lockfile install, the recorded full `pnpm verify` exit code was `0`. Focused
package and live PostgreSQL evidence is listed below; the documentation build
also passed after the report change.

## Evidence discipline

- **Observed** is checked-in source/test evidence or an executed isolated
  probe. It is not a claim about frequency across all applications.
- **Inference** is a bounded design conclusion from observed behavior.
- **Hypothesis** is a candidate needing a matched application or Fresh-Agent
  experiment.
- **Repository evidence** is reviewable source, tests, and this report.
  **Supplementary evidence** is the disposable probe output used to test
  narrow behavior; it cannot by itself promote an application-wide guarantee.

## Acceptance items

| Acceptance item | Status | Evidence | Gap |
|---|---|---|---|
| Baseline and requirement corpus | **done** | `c116761`, isolated clean status, a 28-row corpus spanning eight requested domains and all minimum requirements. | Corpus counts are composition, not market prevalence. |
| Five-stage taxonomy and security/reviewability analysis | **done** | Every row considered the same ordered mechanisms and has a support placement. | Several rows are inference/hypothesis, not production measurements. |
| Focused PostgreSQL probes | **done** | 12/12 disposable PostgreSQL 16 probes passed, including binding, sort, nullable keyset, variants, joins, and EXPLAIN. | Fixture plans are not universal performance claims. |
| Raw SQL / Ashiba / Drizzle / Kysely comparison | **done** | Compile-only probe ran actual Drizzle 0.45.2 and Kysely 0.29.5 over six disputed cases. | No live DB, schema-drift, or transaction comparison for those packages. |
| Fresh-Agent comparison | **partial** | 82 current adapter tests passed; prior controlled construction evidence is explicitly reused. | No independent controlled Fresh-Agent runner, so no new natural-adoption, retry, or human-intervention rate is claimed. |
| Decision, Constitution, and prototype gate | **done** | This decision record narrows adoption boundaries; no candidate met every prototype gate. | Dynamic keyset/grouping and governed analytics catalog need follow-up. |

## Requirement corpus and taxonomy

The corpus covers business search, admin/list, report/export, batch,
dashboard, workflow queue, pagination-heavy API, and analytics-like screens.
The table reports the **first adequate current recommendation**, not the only
possible implementation. `Common` means a recurring enough bounded pattern to
be useful for Ashiba rules/proof; it does not automatically authorize a new
feature.

| Requirement | Evidence | First adequate mechanism | Placement | Why lower mechanisms stop |
|---|---|---|---|---|
| optional scalar predicate | Observed | Binding | Common | a null/scalar value does not change syntax |
| multiple optional predicates | Observed | Subtraction | Common | known branches can be removed from one reviewed maximum shape |
| `IN` / list input | Observed | Binding | Common | PostgreSQL `= ANY(array)` keeps list values as data |
| date range | Inference | Binding | Common | bounds are values |
| `LIMIT` / `OFFSET` | Observed | Binding | Common | counts are values; application still validates range |
| dynamic sort key | Observed | Closed-world | Common | identifier is syntax, but a finite reviewed key map is sufficient |
| sort direction | Observed | Closed-world | Common | direction is syntax, but a finite map is sufficient |
| `NULLS FIRST/LAST` | Observed | Separate canonical SQL | Application | current Safe Sort rejects these terms; finite expansion is possible but unmeasured in product |
| multi-column sort | Observed | Closed-world | Common | one finite profile can select reviewed ordered terms |
| fixed-sort keyset | Hypothesis | Binding | Common | cursor values bind when order/predicate are fixed |
| dynamic-sort keyset | Hypothesis | Insufficient evidence | Application | direction changes predicate and order; finite count/maintenance needs matched evidence |
| exact/prefix/contains mode | Inference | Closed-world | Common | mode is finite syntax/operator choice |
| optional JOIN | Inference | Separate canonical SQL | Application | join cardinality and plan/contract can diverge |
| optional projection | Inference | Separate canonical SQL | Application | projection changes result/authorization contract |
| screen versus export projection | Inference | Separate canonical SQL | Common | owned contracts, PII, and tuning are clearer separately |
| finite aggregate choice | Inference | Separate canonical SQL | Application | aggregate/result semantics differ materially |
| `GROUP BY` variation | Inference | Insufficient evidence | Application | finite report modes and open grouping have different boundaries |
| optional `HAVING` | Inference | Subtraction | Application | known aggregate condition can be removed; semantic divergence may split queries |
| finite status/business mode | Observed | Closed-world | Common | enum-like modes map to reviewed predicates/expressions |
| arbitrary nested boolean tree | Hypothesis | Open-ended Builder | Explicitly out of scope | tree shape is unbounded syntax |
| arbitrary JOIN graph | Hypothesis | Open-ended Builder | Explicitly out of scope | relation graph is unbounded syntax/cost/authorization |
| user-selected columns | Hypothesis | Open-ended Builder | Explicitly out of scope | identifiers and result surface are unbounded |
| user-selected aggregates | Hypothesis | Open-ended Builder | Explicitly out of scope | functions/expressions and cost are unbounded |
| user-selected grouping | Hypothesis | Open-ended Builder | Explicitly out of scope | group shape is unbounded |
| batch scope and chunk | Inference | Binding | Common | IDs, cursor and batch size are data; workflow remains app-owned |
| fixed dashboard metrics | Inference | Separate canonical SQL | Common | distinct grain/plan/metric meaning warrants separate resources |
| queue claim / lock | Observed | Separate canonical SQL | Application | locking and transaction boundary must remain explicit |
| PostgreSQL array/JSON/search | Observed | Binding | Common | fixed operator/expression with bound values needs no builder |

Corpus composition: Binding 7, Subtraction 2, Closed-world Construction 5,
Separate Canonical SQL 7, Open-ended Builder 5, Insufficient Evidence 2.
Those numbers describe the deliberately bounded corpus, not the outside world.

## PostgreSQL observations

The supplementary fixture created and removed a private schema in a local
PostgreSQL 16 instance. All 12 probes passed in 0.304 seconds.

### Binding and its hard boundary

- `ANY($1::bigint[])`, `LIMIT $2`, and `OFFSET $3` executed with array/page
  values bound as values. A negative `LIMIT` was rejected by PostgreSQL, so
  policy validation remains application responsibility.
- `ORDER BY $1` accepted the value `name`, but it ordered by a **constant
  expression**, not by the `name` identifier. This is an observed reason not
  to mistake parameter binding for identifier/direction binding.
- Fixed PostgreSQL full-text, JSON, array, or trigram-style expressions can
  retain their syntax in canonical SQL while search terms bind.

### Dynamic Sort

The fixture executed finite mappings for a simple column, multi-column order,
ASC/DESC, explicit NULL placement, `lower(name)`, `COLLATE "C"`, and a `CASE`
expression. Every executable term was source-defined; no request text became
SQL syntax. This validates the *pattern*:

```text
runtime input -> reviewed key -> predefined complete ordering term
```

It does not prove that current Ashiba Safe Sort already supports the whole
pattern. Current Safe Sort correctly rejects explicit `NULLS FIRST/LAST` rather
than silently losing their semantics. A future finite-null policy is a
candidate only after a separate before/after Agent and product experiment;
none is adopted here.

### Keyset pagination

A fixed nullable order used explicit null handling and an `id` tiebreaker; its
cursor values were parameters. Switching ASC to DESC changed **both** the row
comparison and `ORDER BY`, producing two inspectable variants. Therefore:

- fixed policy + bound cursor: Binding;
- a small known strategy catalogue: potentially Closed-world or separate SQL;
- a growing cross-product of key, direction, null policy, cursor encoding, and
  tiebreaker: not yet demonstrated as practically maintainable.

For example, 2 sort keys × 2 directions × 2 null policies × 3 cursor modes is
24 strategies before application business modes. Finite is not automatically
simple; the actual variant/test/review count must be measured before product
support is proposed.

### JOIN, projection, and plans

Two canonical variants (`users_only`, `with_order_total`) passed with distinct
row contracts. This is clearer than a generic projection/join string for a
small owned include set, while it does not scale to arbitrary user analytics.

The fixture's `EXPLAIN` facts are deliberately narrow:

| Query | Observed plan | Cost |
|---|---|---:|
| indexed `name ASC NULLS LAST, id ASC` | `Limit -> Index Only Scan` | 1.83 |
| `lower(name)` without expression index | `Limit -> Sort -> Seq Scan` | 252.60 |
| offset 4000 | `Limit -> Index Only Scan` | 311.73 |
| keyset after cursor | `Limit -> Index Only Scan` | 2.51 |

They demonstrate that a finite expression choice can have a real plan
consequence and that a keyset policy can outperform deep offset in this
fixture. They do not choose a universal pagination or sort architecture.

### Open-ended analytics counterexample

A fixed `date_trunc($1, created_at)` bucket and time bounds were bound values.
The request “arbitrary dimensions `country/device/plan` plus
`sum/p95/distinct-count`” has unbounded identifiers, aggregate expressions,
`GROUP BY`, result type, authorization, and cost. It cannot safely be one
free-form canonical SQL string. Its honest choices are a finite semantic
catalog, separate approved reports, or a governed builder/analytics engine.

## Security and canonical-SQL reviewability

| Mechanism | Can runtime value become syntax? | Capability relative to canonical SQL | Review/client/EXPLAIN outcome |
|---|---|---|---|
| Binding | no | unchanged | one independently executable SQL resource |
| Subtraction | no, if rewrite only removes reviewed branches | equal or smaller | maximum predicate surface remains visible; branch tests required |
| Closed-world map | not after `input -> key -> fixed fragment` | finite, bounded by reviewed map | all allowed terms must be source-visible and complete |
| Separate canonical SQL | no | one reviewed contract per resource | strongest direct SQL-client and tuning round-trip |
| Open-ended builder | values can still bind; identifiers/shape vary | broader than any one canonical resource | compiled/logged SQL and domain policy become required review artifacts |

Raw APIs remain a boundary in Drizzle and Kysely too: their normal builders
compiled values as `$1…` parameters, but `sql.raw` emitted the supplied string
verbatim in the probe. That is useful for database syntax, not an automatic
allowlist. Kysely `dynamic.ref` quoted an identifier for a genuinely dynamic
analytics dimension; this is a legitimate capability with a deliberately
broader runtime surface.

## Raw SQL, Ashiba, Drizzle, and Kysely

The supplementary compile-only probe used Drizzle 0.45.2 and Kysely 0.29.5.
It compiled six representative requirements; it did not execute them against a
database.

| Problem | Raw SQL / Ashiba rules | Ashiba current mechanism | Drizzle/Kysely result | Decision |
|---|---|---|---|---|
| optional search + finite sort + page | canonical SQL and values | binding + finite Safe Sort | typed builder with bound placeholders | all fit; choose canonical SQL when direct review/execution matters |
| dynamic list | PostgreSQL array/explicit driver convention | no general list-expansion policy observed | `inArray` / `in` expanded bound placeholders | builders have convenience; Ashiba should document adapter policy before feature work |
| free-form sort | unsafe interpolation | intentionally unavailable | raw escape hatches emitted verbatim string | retain finite map; do not add free sort |
| subtractive optional predicate | two reviewed shapes | optional-condition compression | conditional composition | all fit; no builder necessity |
| PostgreSQL full-text expression | canonical expression + bound term | canonical SQL | raw expression with bound value | both viable; standalone SQL improves client/tuning reuse |
| open analytics dimension | finite catalog or separate reports | intentional non-goal | Kysely `dynamic.ref` directly composed identifier; Drizzle minimal probe required raw | builder/analytics system wins when truly open |

Drizzle documents `.$dynamic()` so reusable functions may add clauses or joins;
Kysely documents composable expressions and dynamic references. Those are
composition strengths, not evidence that ordinary bounded search needs them.
Neither normal builder path makes arbitrary request-provided sort text safe;
the application still needs finite maps or a policy layer.

## Fresh-Agent and natural-selection result

**Status: partial.** This worktree did not expose a controlled independent
Fresh-Agent runner or model allocation. No agent selection was simulated.

The direct package check passed 82 tests across the core and PostgreSQL
adapters, including unknown/duplicate/SQL-like sort rejection, invalid
directions, stale/missing model metadata, optional-condition composition, and
execution shaping. Existing construction evidence remains relevant context:
Tool Available agents did not naturally select Ashiba commands in the prior
Greenfield/Brownfield cells; Tool Required scaffolds needed repair or were
discarded. It is not a new dynamic-SQL tool-adoption rate.

Consequently, final correctness, injection safety, canonical reviewability,
and architecture fit have direct mechanism evidence, but natural approach
selection, LLM retries, false repair, human intervention, files/bytes read,
and tokens remain unmeasured for this five-case comparison.

## Adoption boundaries

### Ashiba boundary

Ashiba is a natural fit when the application owns a finite query contract:
business search, queues, bounded report modes, fixed dashboards, batch scope,
and finite sort/search choices. Its distinctive value is not that it can
compose every query: canonical SQL remains executable, tunable, and the
reviewable maximum capability while bindings and finite profiles cannot silently
add syntax.

### Builder boundary

Choose a query builder or dedicated analytics system when the product actually
requires an evolving user-defined query language: arbitrary predicate trees,
join graphs, output columns, aggregate expressions, grouping dimensions, or a
large enough strategy catalogue that every supposed finite variant becomes an
unreviewable copy/branch matrix. The builder must then be accompanied by a
semantic catalog/authorization/resource policy; parameterization alone is not
that policy.

### Ashiba support candidates

- **No new Dynamic SQL feature is adopted.**
- Binding, optional-condition subtraction, source-visible finite sorting, and
  explicit separate SQL are already the relevant patterns.
- Documenting PostgreSQL list-array policy and measuring finite null-ordering
  or dynamic-keyset ergonomics are *experiments*, not feature commitments.

### Explicitly out of scope

Generic query builder/fluent API/runtime AST, arbitrary joins/projections,
arbitrary grouping/aggregate/filter tree, repository redesign, ORM, migration
framework, and new MCP remain out of scope.

## Constitution update and remaining hypotheses

The evidence supports retaining, not upgrading to proven invariants:

- **Subtraction-first dynamic behavior:** Strong hypothesis. It fit known
  optional predicate/HAVING branches, but optional joins/projections often
  became clearer as separate SQL.
- **Closed-world construction:** Strong hypothesis. The PostgreSQL probe shows
  the pattern works for complete finite sort terms, yet variant explosion and
  current `NULLS` limitations prevent a universal rule.
- **Runtime capability must not silently exceed canonical SQL:** Strong
  hypothesis. Binding/subtraction preserve it; a finite map preserves it only
  when all complete terms are reviewed; builders deliberately broaden it.

Open hypotheses: practical dynamic-keyset variant threshold; governed
analytics semantic catalog versus builder; Fresh-Agent natural selection and
repair burden; current Safe Sort support for finite null-ordering.

## Prototype decision

**No prototype adopted or reverted.** No candidate met all gates: high
frequency demonstrated in a real application, inability of bind/subtract/
separate SQL, safe finite design, small implementation, and measured
Agent/application benefit. Implementing a safe pagination or null-ordering API
now would mistake a plausible experiment for evidence.

## Recommended next phase

Run a controlled five-case Fresh-Agent experiment with identical requirements
under Raw SQL/Ashiba rules, Ashiba Tool Available, and Drizzle/Kysely Tool
Available. Record discovery, commands, retries, false repairs, final live
behavior, review edits, and generated/canonical surface. Prioritize dynamic
keyset, finite null ordering, optional projection/join, and one deliberately
open analytics workload. Do not implement a builder before that result.

## Self review

### Consistency review

- Each acceptance item has status, evidence, and gap; observed, inference, and
  hypothesis are not collapsed.
- Supplementary PostgreSQL/compiler output is not presented as a prevalence or
  universal performance claim.
- No local filesystem path is used in GitHub-facing text.

### Human acceptance review

- The adoption boundary, non-adoption of a product feature, and the two
  strongest technical limits are visible before implementation detail.
- **Follow-up:** controlled Fresh-Agent cells and a finite-keyset/null-ordering
  maintenance experiment.
- **Nit:** the corpus is deliberately broad enough that some classifications
  remain inference rather than live application observations.
- **Review readiness:** ready as an evidence-bounded no-product-change audit.

**What the human should decide next:** accept the boundary and run the
controlled Fresh-Agent follow-up, or request that bounded experiment before
accepting any Dynamic SQL support candidate.
