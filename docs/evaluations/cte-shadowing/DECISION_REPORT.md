# CTE Shadowing vs Seeded Fixtures for SQL Mapping Tests

## Executive conclusion

**Decision: reject as an Ashiba recommendation or product feature.** CTE
shadowing is technically viable for a narrow, read-only, seedless mapping proof.
In the measured application-SQL reference it did not produce a material warm
performance advantage over the existing suite-level seeded approach, and it adds transformation,
fixture-shape, and drift/safety responsibility that the seeded suite does not
need. A tie or small advantage belongs to the conventional seeded approach.

This is not a statement that CTE fixtures are invalid. It is a bounded decision
about the default proof for application SQL mapping in this repository.

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
