# Runtime SQL mechanism boundary evaluation

## Decision

**done — evaluation only; no product reduction is proposed.** Named parameters
remain the minimum source-level Ashiba contract. A correct development-time
artifact can remove runtime SQL lexing from direct PostgreSQL execution, but
the current compiler fails the registered nested-comment corpus and therefore
cannot yet support that reduction. Optional-predicate subtraction has a
material generic-plan work advantage in this fixture. Multi-column sorting can
use a closed application whitelist plus a development-time coordinate and
mechanical runtime splice; Safe Sort adds shared placement and stale-artifact
protection, not business-sort semantics.

## Baseline and method

The evaluation starts from merged #62 (39207a1) and #63 (d7566aa), including
the post-body human-acceptance PR comment. #63 established three-state
optional-filter meaning and a complete SQL asset for one ordering. It did not
establish planner behavior for a larger optional search or the smallest runtime
boundary.

The durable fixture is under docs/evaluations/fixtures/runtime-sql-mechanism-boundary.
Its decision log marks the earlier two-predicate result as calibration only.
The scored runner uses a frozen 200k-row skewed PostgreSQL 18 dataset, items
LEFT JOIN customers, six indexes, seven independently tri-state properties,
prepared statements, EXPLAIN ANALYZE BUFFERS JSON, auto/custom/generic cache
modes, and five executions per strategy/case. Checked-in JSON is the primary
evidence; the disposable local PostgreSQL run is supplementary execution
evidence.

## Acceptance items

### N0–N4 named binding

**Status:** done
**Evidence:** the canonical corpus covers repeated names, casts, quoted
identifiers, escaped strings, dollar quotes, line comments, block comments, and
nested block comments. N0 is direct positional PostgreSQL source; it has no
name/reorder protection. N1/current lexical lowering emits the nested-comment
pseudo-name, recorded before any remedy in evidence/named-parameter-result.json.
N2's fixture compiler creates positional SQL, ordered names, and a source hash,
maps values mechanically, rejects stale source, and executes the compiled SQL
directly through node-postgres with the same row result as an N0 positional
query. N3 source inspection shows
the current adapter uses that artifact shape plus optional/sort/wrapper work.
N4 records that node-postgres accepts positional SQL and values, while psql
offers client-side variable facilities rather than a portable Node named-binder.
The canonical named source also executed through psql.
**Gap:** the fixture compiler is evidence, not product code; current N3 cannot
claim full lexical-corpus correctness until its nested-comment defect is fixed
in a later product change.

Named SQL should remain a rule because it preserves source readability, direct
maintenance, SQL-client investigation, and resilience to reordering. It does
not imply that Ashiba must own runtime name parsing. N2 proves runtime can be
only source-hash validation plus ordered value mapping and a normal pg call
when development tooling produces a correct dialect artifact. Precompiled
coordinates move PostgreSQL lexical complexity to development time and reject
source drift before execution.

### O1–O3 optional predicates

**Status:** done
**Evidence:** all nine registered states returned identical O1/O2 counts:
all omitted (200000), rare customer (200), hot skewed customer (2200), hot
status (198000), null assignee (20000), multiple selective (133), selected hot
customer/status asset (2000), mixed omitted/null/value (2000), and date range
plus rare status (2000). The O3 selected asset is intentionally applicable only
to its hot customer/status shape, not all 3^7 combinations.

For auto and force_custom_plan, O1 and O2 had the same node family and buffer
work for selective cases; small median time changes are not a winner. For
force_generic_plan, O1 static guards produced an incremental index-scan path
with 560/125 shared hit/read blocks for rare customer and 951/69 for the
multiple-selective case, versus O2 selective bitmap paths with 202/0 blocks in
both cases. Recorded median execution times were 7.249ms versus 0.121ms and
11.705ms versus 0.122ms respectively. This is a plan/work difference, not a
timing-only judgment. O3 matched O2's selected asset plan shape and had no
separate generality advantage.
**Gap:** this is one PostgreSQL version, schema, distribution, and fixed
pagination workload; it does not generalize a numeric threshold to every query.

Static tri-state SQL is correct and adequate under observed auto/custom
conditions, but it is not plan-stable under forced generic reuse for selective
states. Precomputed subtractive processing therefore retains a demonstrated
performance reason. Separate assets are reasonable only for a small,
intentionally hot closed set; they do not replace general subtraction.

### S1–S3 multi-column sort

**Status:** done
**Evidence:** the evaluator accepts one, two, or three reviewed keys; mixed
directions; reordered keys; and a computed priority CASE expression. It fixes
id ASC as a tie-breaker and rejects raw/hostile keys, invalid directions,
duplicates, empty input, and more than three keys. The live oracle compares
the three-key S1 whitelist result with S2 hash-validated coordinate splice,
rejects altered source metadata, and compares S1 single createdAt ordering with
the S3 selected complete asset.
**Gap:** S3 is deliberately a single-sort baseline and does not enumerate
multi-column permutations.

Whitelisted fragments plus bounded ordered composition is a closed-world
candidate: keys, directions, maximum count, and fragments are reviewed before
runtime, and runtime input never becomes a SQL fragment. S1 needs an explicit
placement contract. S2 supplies that contract with a development-time compiled
coordinate, source hash, and mechanical splice; it does not parse SQL at
runtime. CASE business ordering remains application-owned.

### Driver boundary

**Status:** done
**Evidence:** driver-boundary/inventory.md traces actual development-time and
runtime functions. driver-boundary/architecture-comparison.md maps candidate
boundaries.
**Gap:** no product implementation was changed, so this is a design decision
for a subsequent product PR rather than migration proof.

| Responsibility | Smallest supported owner |
| --- | --- |
| Named source rule and sort semantics | Application |
| Names, source hash, edit ranges, dialect placeholders | Development-time Ashiba |
| Ordered values, hash check, coordinate splice | Generic tiny helper or application |
| Optional subtraction | Generic helper using dialect artifact |
| pg value-binding API and placeholder representation | External driver / dialect artifact |
| Pool, transactions, observations, masking, retry policy | Application or separate operational wrapper |

Named-binding evidence alone does not justify a driver package: a
development-time PostgreSQL artifact plus direct node-postgres call is viable
once lexical correctness exists. Conversely the proven generic-plan value of
optional subtraction, shared sort placement, and optional operational services
can still justify a cohesive Thin Driver if the product wants one. Evidence
does not support deleting it today.

## Architecture comparison

| Candidate | Runtime SQL analysis | Retained responsibility | Current evidence |
| --- | --- | --- | --- |
| A: application artifact + direct driver | None | hash/value map in application | Viable for named binding after compiler repair |
| B: generic tiny helper + dialect artifact | None | value map, subtraction, coordinate splice | Smallest general candidate supported by O/S evidence |
| Current Thin Driver | None on precomputed normal path | B plus pg normalization, profiles, masking, observation, retry | Retain only if shared services are desired |

## Guarantee limits and next step

This PR changes no public API, Safe Sort, SSSQL, or driver source. It proves
boundary facts for the registered fixture; it does not make a removal claim.
The next product decision is whether to repair development-time lexical
compilation first, then introduce Candidate B or keep the same responsibilities
inside the existing driver after a separately reviewed migration design.
