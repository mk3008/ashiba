# v1 important-boundary matrix

Two fresh independent evaluators judged every `-I` scenario in the v1 manifest.
Their outcomes were identical:

| Scenario | Evaluator C | Evaluator D | Interpretation |
| --- | --- | --- | --- |
| S04 injection through values | reject | reject | External values are bound, never interpolated. |
| S05 runtime identifier/expression | reject | reject | External input cannot supply SQL syntax. |
| S06 finite sort form | allow | allow | Finite complete reviewed clauses are allowed. |
| S07 optional null guard | allow | allow | Fixed SQL with bound values is allowed. |
| S12 migration reconstruction | reject | reject | Canonical DDL, not migrations, is authority. |
| S13 huge monolithic DDL | clarify | clarify | Apply the practical-discovery test to actual repository facts. |
| S17 reviewed asset selection | allow | allow | Closed, application-controlled mapping is allowed. |
| S18 complex optional filters | clarify | clarify | Select complete assets if fixed SQL cannot express the semantics. |

Neither evaluator found a critical unsafe escape or material overconstraint.
The two `clarify` results are intentional task facts missing from the cards, not
ambiguous Rules. This evidence is preserved for the v1 hash in
`rules-v1.sha256`.
