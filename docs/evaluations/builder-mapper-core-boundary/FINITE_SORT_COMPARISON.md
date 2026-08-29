# Finite Sort Comparison

| Dimension | A. CASE-based static SQL | B. Reviewed finite literal composition | C. Explicit query variants |
| --- | --- | --- | --- |
| SQL injection / hostile input | Safe when values only select CASE branches | Safe when the map is closed-world and terms are source-controlled | Safe when selection chooses only known assets |
| Unknown direction/key | Bind/value validation must reject it or CASE becomes no-op | Direct, fail-closed application validation | Direct preset/variant validation |
| Duplicate / multi-sort | Repeated slots require SQL and value conventions | Small explicit validation loop; Ticket Queue rejects duplicate keys | Combination count grows with allowed orders |
| Stable tie-breaker | Visible static suffix | Explicit fixed suffix required | Repeated in each asset or shared reviewed asset construction |
| Review surface | SQL is visible but Support Inbox's 4-slot matrix is large | Small map plus a stable SQL anchor; terms are visible in application code | Each query is visible; copies can drift |
| Change amplification | Keys × directions × slots expand CASE expressions | Add or revise one reviewed term and focused tests | Add assets/presets, often duplicates predicates/results |
| Model-gen/freshness | Normal SQL asset flow | Base SQL still uses normal metadata/freshness; ordering syntax is a reviewed application policy | Every variant participates in normal generation/freshness |
| DBMS portability | CASE portability must be maintained | Terms are dialect-specific application policy | Each SQL asset remains dialect-specific |
| AI editability | Large patterned edits risk omission | Ordinary finite-map edit with deterministic negative controls | Ordinary SQL edits but potentially broad duplicate updates |

## Decision

**Dynamic sort: CONTEXTUAL.** Prefer reviewed finite literal composition for a
small bounded sort menu, including multi-sort, where a single stable SQL anchor
is clear. Prefer explicit query variants for a small number of business
presets or materially distinct query shapes. Do not add more CASE slots merely
to avoid source-controlled literal composition.

The decision does not restore Safe Sort runtime ownership and does not require
changing Support Inbox in this evaluation. CASE-based SQL remains a valid
application choice when its review cost is acceptable, but no evidence shows
it is categorically safer than a correctly validated finite map.
