# CTE Shadowing vs Seeded Fixtures: Mapping and SQL Logic Tests

## Executive summary (current)

For DTO mapping with shared fixtures, ordinary suite-level physical seeding
remains the simplest default. For independent one-row mapping, statement-local
CTE fixtures provide real isolation, but no performance break-even was
observed.

For scenario-oriented SQL logic, CTE fixtures are structurally more natural
because fixture values define each scenario. Serial S/M/L cells can favor CTE,
but useful pool concurrency changes the economics. At the best measured
concurrency for 100 scenarios, transaction + batched physical fixtures won at
every scale: S 48.57 ms / 71.10 ms CTE, M 48.80 ms / 117.25 ms CTE, L 92.33 ms
/ 270.74 ms CTE, and XL 233.41 ms / 1,184.09 ms CTE.

Complete CTE fixtures had zero observed cross-scenario contamination and
required no physical fixture transaction or cleanup. With the pinned released
`@rawsql-ts/testkit-postgres@0.16.9`, intentionally incomplete or empty
fixture rows could still read physical data despite `missingFixtureStrategy:
'error'`. This is observed behavior of that released version, not a claim
about all rawsql-ts versions or parser approaches.

The observed CTE advantage is therefore complete-fixture isolation, not a
demonstrated general performance win. No Ashiba dependency, API, helper, CLI,
Skill, or Scope change is justified.

## Stage 1: minimal hand-built feasibility (historical)

### Executive conclusion

**Decision: reject as an Ashiba recommendation or product feature.** CTE
shadowing is technically viable for a narrow, read-only, seedless mapping proof.
In the measured application-SQL reference it did not produce a material warm
performance advantage over the existing suite-level seeded approach, and it adds transformation,
fixture-shape, and drift/safety responsibility that the seeded suite does not
need. A tie or small advantage belongs to the conventional seeded approach.

This is not a statement that CTE fixtures are invalid. It is the historical
minimal-hand-built decision; Stage 2 narrows the current default decision to its
measured suite-level, mostly serial workload, and Stage 3 separately evaluates
parallel independent fixtures.

## Problem

SQL/driver/DTO mapping needs evidence at the boundary where database types,
driver representations, and application DTO expectations meet. A pure mock
cannot establish that PostgreSQL `bigint` arrives as a string or that
`timestamptz` arrives as a `Date` through `pg`. The existing seeded Reference
already executes canonical SQL against real PostgreSQL, uses real `pg`, checks
those representations, and separately proves behavior and rollback.

## Techniques compared

### Seeded physical fixtures

The current Reference creates two physical relations, applies 17 lines / 473
bytes of DDL, and seeds 6 lines / 517 bytes once per suite. Its four canonical
queries and 86-line test suite cover mapping along with business behavior and
transaction rollback. This is the actual comparison baseline; it is not a
per-test database recreation.

### CTE-shadowed fixtures

The candidate prefixes typed `tickets` and `ticket_events` CTEs to the source
SQL, compiles the existing named parameters, shifts indexed placeholders after
the fixture values, and sends SQL plus separate values to `pg`. It does not
maintain a hand-written copy of the existing get/list SQL. The evaluator adds
two canonical test fixtures only to cover a join and a query that already has a
CTE.

## What CTE shadowing can and cannot prove

It can prove that a selected read-only SQL shape executes in the real engine;
that the real driver produces selected runtime representations; and that finite
result rows fit an expected DTO shape. In this evaluation it observed bigint as
string, timestamptz as `Date`, and a nullable value as `null`.

It cannot prove complete business semantics, transaction/rollback behavior,
migration correctness, triggers, query statistics, exhaustive expression
nullability, or all application-table reference forms. Those remain more
appropriately covered by seeded integration tests.

## Prior art

CTE fixture/table shadowing is established practice, not an Ashiba invention.
Bruin documents unit tests that replace input tables with controlled rows on a
real connection and run one read-only select; its documentation also records
the important distinction between a typed empty fixture and an error for an
unaccounted relation. [Bruin Unit Tests](https://getbruin.com/docs/bruin/quality/unit-tests.html)
and its [unit-test package documentation](https://pkg.go.dev/github.com/bruin-data/bruin/pkg/unittest)
explicitly describe a rewriter that finds and renames used tables, prepends CTEs,
and refuses an untyped unmocked read.

SQL Testing Library also documents a default CTE mode, but it is a Python
library and its public material was used only as evidence that the technique is
not novel, not as evidence for PostgreSQL application-SQL suitability.
[SQL Testing Library package page](https://pypi.org/project/sql-testing-library/)

A public pg-testkit benchmark reports seedless CTE-style testing as faster than
a *traditional per-test setup* under its stated test shapes. That is external
benchmark evidence, not this evaluation's result: the current Reference
amortizes its suite setup, so that comparison is not fair here.
[pg-testkit benchmark](https://zenn.dev/mkmonaka/articles/680d1f9be14b71)

The reusable lesson from the prior art is not a preferred API. It is that
fail-closed relation coverage and typed fixture shape require deliberate
rewriting/schema information; a bare `WITH` prefix is not sufficient for a
general implementation.

## Methodology

The evaluation uses a disposable local PostgreSQL 16 database, Node v22.14.0,
Windows, and the Reference's real `pg` dependency. It evaluates simple get,
optional-filter list with repeated logical parameter, two-table join, and an
existing CTE. Seven warm samples were recorded at 1, 10, 50, 100, and 300
checks. Container startup is deliberately excluded and physical setup, query
execution, and CTE transformation are reported separately. Full raw samples,
environment, and query bytes are in `benchmark-results.json`.

Numbers are machine-local observations and must not be compared across machines
without normalization.

## Correctness and safety

### Physical fallback

Each candidate execution uses `BEGIN`, `SET LOCAL search_path = pg_temp`, then
the CTE-prefixed query. Even while physical tables existed from the baseline
benchmark, omitted `tickets` and `ticket_events` fixtures failed relation-not-
found rather than reading `public` data. That is cheap, useful fail-closed
behavior for unqualified references.

It is not general protection: a schema-qualified physical relation can bypass
this search-path measure. Making coverage general would require table-reference
analysis and rewriting or stronger database isolation, which is material extra
responsibility.

### DDL drift

The smallest guard compared two fixture column/type signatures to the existing
DDL. It caught `bigint -> uuid` and an additional required column. It did not
catch a nullability-only change, because finite CTE rows do not establish that a
result expression can never be null. The guard is deliberately narrow and is
not retained as product infrastructure. Its added extraction logic, plus the
false-green boundary, count against adoption.

### Transformation fidelity and debugging

The ordinary leading-`WITH` text transformation needed rework: JavaScript
replacement-string handling interpreted fixture `$1` placeholders as capture
references, corrupting the SQL. A function replacer fixed this. Empty fixtures
also initially produced invalid `WITH`. These failures were local and
debuggable only after printing the transformed SQL, but demonstrate why a small
transformation is still a maintained mechanism. It deliberately does not claim
support for schema-qualified relations, recursive CTEs, dollar-quoted forms, or
all comments/formatting.

## Developer/AI usability

A history-free agent received an ordinary known-technique description with no
exact recipe or helper. It produced a working real-`pg` CTE test in about seven
minutes and used a sentinel row to establish that its CTE—not existing physical
rows—was selected. It also observed the expected bigint/string, timestamp/Date,
and null representations.

The result is not a usability win. It manually copied the canonical
select/filter/order/limit SQL into a temporary script, had a placeholder
quoting failure in PowerShell, needed explicit casts for bigint/timestamptz/null,
and hit Node ESM package resolution friction from the external workspace. Thus
the technique can be explained, but preserving source-SQL ownership and
safe fixture details requires more guidance or a framework. Adding a helper to
hide all of that would be a new product surface without evidence of net value.
The full contemporaneous observation is E5 in `EXPERIMENT_LEDGER.md`.

## Performance

The median warm data is summarized in `BENCHMARK_RESULTS.md`. The key 300-check
result was seeded setup plus execution 195.26 ms, versus CTE transform plus
execution 191.52 ms. CTE execution alone was slower at every measured size;
the small total difference comes from omitting setup. At 100 checks the total
difference was 77.83 versus 65.36 ms. The transformed single-relation query was
542 bytes for three fixture rows.

For an occasional local run, PR CI, and the measured repeated developer loop,
the 4–12 ms raw gain has no useful total-cost significance. Ten 100-check loops
would save about 125 ms before any drift check or debugging. No break-even point
appeared through 300 checks. At larger relation counts, CTE text, placeholder
shifting, and diagnostics grow; this evaluation does not invent a framework
merely to claim unmeasured scaling.

## Maintenance cost

The candidate is intentionally only an evaluation harness. Its costs are typed
fixture representations, source SQL prefixing, indexed placeholder shifting,
transformed SQL visibility for diagnostics, fail-closed handling, and drift
guard ownership. The existing seeded suite has DDL and seed assets but no table
reference rewriter or second relation-shape abstraction.

## Decision

**Reject.** The candidate works, but it is not materially better than the
current seeded mapping proof after normal suite-level setup amortization and
total ownership cost. No Ashiba-owned helper, API, CLI command, generated
format, runtime dependency, or Scope rule is justified.

## Limitations and reconsideration triggers

This result is limited to one small PostgreSQL application reference, three-row
mapping fixtures, seven warm samples, and the listed SQL shapes. Reopen the
decision only with evidence that addresses the rejection reasons: a real
mapping-only corpus where suite-level physical setup cannot be amortized; a
measured total-cost win including authoritative relation-shape drift checks;
safe coverage for schema-qualified/complex SQL without a large framework; and
a repeatable Fresh-Agent holdout that uses the technique without SQL duplication
or physical fallback. Even then, seeded business and transaction tests remain
separate responsibilities.

## Ashiba-specific note

All retained code is under this evaluation directory. No product package,
public API, CLI, named-parameter behavior, generated contract format, or
Reference application code changes are part of the decision.

## Stage 2 follow-up: same-SQL correction and library-backed challenger

The first-stage benchmark limitation was material: its seeded execution used a
simplified query while its hand-built CTE execution used canonical SQL. That
comparison is retained in the ledger but is not a valid relative execution
result. Stage 2 reran all arms from the same canonical `get.sql`, parameter
input, selected columns, Ashiba compile/bind path, and real `pg` result. It
also asserted field names, selected row, bigint/string, timestamptz/`Date`, and
nullable representation before timing.

Stage 1's execution-only relative comparison is invalid because its seeded and
CTE arms did not use the same SQL. Stage 2 corrected that measurement: avoiding
the seed is useful for isolated 1–100-check loops, and the arms converge toward
a near tie at 300 checks (195.22 ms versus 201.52 ms median). The performance
finding was therefore corrected and weakened, not reversed: no total-cost
advantage sufficient to support adoption was established.

### Mature rewriter tested

The challenger used current rawsql-ts commit
`546ad8d01e29ba9af30c0f0633bd0a8c86133ae8` and released
`@rawsql-ts/testkit-postgres@0.16.9` (with
`@rawsql-ts/adapter-node-pg@0.15.18` inspected as the node-postgres wrapper).
The evaluation API is public
`createPostgresTestkitClient({ queryExecutor, generated, tableRows, ... })`,
where `queryExecutor` delegates to a real `pg.Pool`. Packages were pinned in an
external temporary evaluation workspace; no source was copied and no Ashiba
package dependency was retained.

This library-backed arm reads canonical SQL directly. It correctly processed
simple get, optional-filter list/repeated parameter, aliases/two-table join, an
existing CTE, and `public.tickets`. Thus a mature AST-backed rewriter removes
the hand-built text insertion and placeholder-shifting limitations; the initial
negative claim about schema-qualified references does **not** apply to this arm.

### Safety and drift after the library

Complete fixtures safely shadowed both unqualified and schema-qualified physical
sentinel rows. However, with a table definition but no row fixture, the released
library emitted original physical SQL even with `missingFixtureStrategy: 'error'`.
An empty generated manifest behaved the same way. A partial join happened to
produce an empty CTE for its missing relation, so coverage is not uniformly
fail-closed. This was proven against real physical tables, not a rewrite
snapshot.

The testkit documents generated metadata as its preferred normal path, with a
DDL fallback. The inspected released package exposes the consumed `generated`
manifest type but not the upstream config generator. The evaluator used its
public DDL loader to make a generated-format snapshot, then measured
regeneration/diff freshness. Column rename/removal/type/addition changed the
snapshot; both nullability-direction changes did not. A stale snapshot remains
accepted until a freshness command is run. Therefore generated metadata removes
some hand-maintained fixture typing but does not by itself establish freshness
or result nullability.

### Fresh-Agent library arm

A history-free agent took about ten minutes to produce a working real-`pg`
test. It read canonical SQL directly, used `createPgTestkitClient` from the
node-postgres adapter, and wrote zero custom transformation lines. The testkit
generated casts, an existing-CTE merge, and named `$1` binding. Its rework was
PowerShell quoting and double-closing a pool, not SQL copying or placeholder
manipulation. Fixture/config work was one definition, one row fixture, a
connection factory, and an execution hook. This is a genuine usability
improvement over the hand-built Fresh-Agent arm, but it only demonstrates the
complete-fixture success path and does not cure the observed fallback behavior.

### Ownership comparison

| Concern | Hand-built CTE | rawsql-ts-backed CTE |
| --- | --- | --- |
| Canonical SQL copied | Fresh Agent did copy it; evaluator reads source | Fresh Agent and evaluator read source |
| Ashiba custom rewrite | Text prefix/placeholder shift; narrow | 0 lines; external AST rewriter |
| Fixture definition | Typed local rows and DDL extractor | DDL-derived manifest plus rows; external manifest/version concept |
| Schema-qualified support | No | Yes, verified |
| Missing fixture safety | `pg_temp` control fails closed for unqualified references | Complete fixtures safe; missing rows/manifest can read physical data |
| Drift/freshness | Narrow custom comparison; nullability false-green | External metadata path; freshness diff required; nullability false-green |
| Dependency cost | None | Pinned parser/testkit packages and API/version knowledge |
| Same-SQL 300-check median | 195.22 ms | 353.68 ms (353.73 ms with warm freshness) |
| Fresh-Agent rework | Manual copy, casts, placeholders | 10 min; 0 rewrite LOC; config/dependency use |

Internal rawsql-ts implementation LOC is not counted as Ashiba-owned code.
Its dependency, API learning, version compatibility, manifest/freshness process,
and integration glue are counted as adoption cost.

## Stage 2 decision

**Stage 2 classification: reject as the default under the measured
suite-level, mostly serial mapping-test workload.** The evaluation included
both a minimal hand-built CTE implementation and an existing AST-backed library
implementation. Therefore the rejection is not based merely on an intentionally
naive transformation.

The mature library genuinely solves source-SQL duplication in the evaluator and
schema-qualified rewriting, but it does not make the normal mapping proof lower
total cost: it is materially slower at normal suite sizes and its missing-row/
missing-manifest controls can reach physical data. Recommending or depending on
a substantial parser/testkit only to save seeded mapping setup is not justified
by these results. The seeded mapping proof remains the default; seeded business
and transaction tests remain necessary in all cases.

Future reopening requires new evidence, not another CTE implementation: a
released/library version that proves uniform fail-closed coverage against real
physical sentinels, authoritative freshness and relevant nullability metadata,
and a real high-frequency or high-scale corpus showing a total-cost win after
those controls. A hand-built speed result alone does not meet this threshold.

### Explicitly untested after Stage 2

Stage 2 did not measure connection reuse, pool sizing, concurrent execution, or
many independent mapping cases. Statement-local fixtures may avoid shared
physical fixture-state collisions when every case has distinct fixture rows;
they may therefore scale differently from a shared physical seeded dataset.
They do not remove CPU, database, pool, network, scheduler, or unrelated-lock
contention. This is an untested hypothesis, not a projected performance win.

Stage 3 must measure two separate questions: wall-time behavior under explicit
connection/concurrency matrices, and whether independent fixtures retain
isolation without an extra fixture-isolation mechanism. Its result may qualify
the default decision only within its measured conditions; it must not rewrite
the frozen Stage 2 serial measurements.

## Stage 3: parallelism, connection reuse, and independent fixtures

`STAGE_2_FROZEN_SHA` is
`a74858f346329ab90e67cfbc7369d256743276a3` (`docs: freeze stage 2 CTE
shadowing decision`). Stage 3 is an additive investigation from that commit.

### Question and method

The question was not whether CTE shadowing is generally good. It was whether a
statement-local fixture changes the cost or isolation of concurrent independent
mapping cases. The experiment used the same canonical `get.sql`, Ashiba
compile/bind, real PostgreSQL, real `pg`, the released rawsql-ts public testkit,
pool max 8, 1/2/4/8 requested concurrency, and 10/50/100/300 unique cases.
Every case asserted its own ID and subject.

Three arms kept the comparison honest: the current shared seeded dataset, a
conventional per-case transaction/insert/read/rollback physical fixture, and
rawsql-ts statement-local CTE fixtures. The physical isolated arm did not pay
for unrealistic container recreation or migrations per case. A shared single
node-postgres client was measured as a serialized reference, not as DB
parallelism. Full matrices and timing boundaries are in
`PARALLELISM_RESULTS.md` and `parallelism-results.json`.

### Results

The shared seeded baseline was fastest in every tested cell. At the best
300-case configurations, seeded shared fixture took 34.41 ms, independent
physical fixture 107.95 ms, and rawsql-ts CTE 123.43 ms wall time. rawsql CTE
did not beat the conventional independent physical mechanism through 300 cases.
Its shared-pool scaling was not monotonic, so concurrency is not an assumed CTE
benefit.

The separate isolation question was positive: all unique-case assertions passed
with zero cross-test contamination, and complete CTE fixtures needed no fixture
transaction, cleanup, lock, schema, or table isolation. The physical independent
arm necessarily used transaction setup and rollback. This structural benefit is
real, but it did not overcome current wall-time or dependency/safety costs.

The Stage 2 physical-fallback result also persisted: an empty rawsql-ts fixture
array read a deliberately placed physical sentinel despite
`missingFixtureStrategy: 'error'`. Stage 3 does not hide that released behavior
behind an Ashiba wrapper.

### Stage 3 classification

**isolation-advantage-only.** Statement-local fixtures have independent value
for complete, independently varying mapping fixtures, but there is no measured
parallel performance or total-ownership case for making them Ashiba's default.
The Stage 2 default rejection therefore remains unchanged for its measured
mostly serial workload, and Stage 3 adds no scale-specific adoption threshold.

### Strong reconsideration rule after Stage 3

CTE shadowing has now been tested with minimal hand-built serial behavior,
mature AST-backed same-SQL serial behavior, shared/pool/single-client models,
and concurrent independent fixtures. Reopen only with evidence that all three
conditions hold: released implementation safety materially changes to fail
closed against physical sentinels; parser/testkit ownership cost materially
falls; and a real production-scale independent mapping corpus exceeds the
measured range with a substantial total-cost win. Neither statement locality nor
a small benchmark delta is enough.

## Stage 4: scenario-oriented SQL logic testing

`STAGE_4_STARTING_SHA` is
`85aee431c1bdfda79a0643f7bfaeeeac3f6ad728`. This is an additive investigation
of a different test shape, not a retry of the mapping recommendation.

### Method and result

An order-eligibility family made fixture values the scenario input: paid/open
orders can win, while insufficient inventory, blocked customers, unpaid orders,
or shipments make them ineligible. S/M/L/XL used 1/2/4/8 referenced relations
and 3/10/30/99 rows. Every case used canonical SQL and Ashiba binding, carried a
unique token, and asserted its own winner or no result.

The primary physical baseline used a warm pool, transaction, batched inserts
per relation, canonical query, assertion, and rollback. The CTE candidate used
rawsql-ts `0.16.9`'s documented public base-client
`withFixtures(scenarioRows)` path, not a hand-built CTE or private rewrite
cache. Real PostgreSQL / real `pg`, 10/50/100 scenarios, concurrency 1/4/8,
and pool max 8 were measured.

At the best concurrency for 100 scenarios, physical versus CTE wall time was
48.57 versus 71.10 ms (S), 48.80 versus 117.25 (M), 92.33 versus 270.74 (L),
and 233.41 versus 1,184.09 (XL). CTE generated SQL grew from about 798 to
17,053 bytes per scenario. CTE showed serial wall-time advantages at S/M/L in
parts of the measured matrix, but those advantages disappeared under useful
pool concurrency and reversed at XL. Across the best-concurrency comparison,
physical transaction + batched fixtures were faster at every measured scale.

### Isolation and safety

All scenario assertions passed with zero cross-scenario contamination. Complete
CTE fixtures eliminate the physical transaction/cleanup mechanism, which is a
real scenario-isolation benefit. The known released safety limitation remains:
a complete CTE fixture returned priority 20 over a physical priority-77
sentinel with the same token, while intentionally empty fixtures returned that
physical priority-77 state despite `missingFixtureStrategy: 'error'`.

### Stage 4 classification

**`logic-test-isolation-only`.** CTE shadowing is more naturally aligned with
scenario-oriented SQL logic than with shared DTO mapping seeds, but the measured
public rawsql-ts path remains slower overall and has the same safety/ownership
costs. It is not a strong-fit or scale-advantage result.

## Consolidated use-shape conclusion

| Test shape | Current evidence | Recommendation |
| --- | --- | --- |
| DTO mapping with shared fixtures | Stage 2 default reject under mostly serial suite-level workload | Keep seeded physical integration proof |
| Independent one-row mapping | Stage 3 isolation advantage, no performance break-even | Keep seeded default; statement locality is only an external structural option |
| Scenario-oriented SQL logic | Stage 4 simpler complete-fixture isolation, no robust performance win | Conventional transaction + batched physical fixtures remain the primary path |

CTE shadowing is therefore neither categorically good nor categorically bad;
its observed value is complete-fixture isolation, not a demonstrated Ashiba
default or general performance solution.

### Final reconsideration rule

This investigation is closed after Stage 4. Reopen only if released
implementation safety materially improves, parser/testkit ownership cost
materially changes, database or environment assumptions materially change, or a
real production corpus clearly contradicts the measured results. Do not repeat
another small synthetic benchmark merely to seek a different result.

Future work should restart from the question, “What is the
minimum-responsibility way to test Raw SQL logic?”, rather than presuming that
CTE shadowing should be implemented. SQL logic testing itself remains a
possible future Ashiba extension; this evaluation adds no such feature.
