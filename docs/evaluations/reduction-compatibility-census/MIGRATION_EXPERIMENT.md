# Golden Path Migration Experiment

Target migration: canonical SQL → deterministic binding artifact →
`bindNamedParameters` → native `pg` → optional contract → application/live
tests. Existing Golden Path evidence establishes parameter rejection, hostile
values, explicit transaction/rollback, and PostgreSQL contract behavior.

Fresh execution status: **partial**. A representative published CLI 0.3.0
starter was generated with its actual scaffold and ZTD assets, establishing the
legacy dependency/artifact set. A direct full rewrite of that generated consumer
is outside this evaluation's no-product-change rule. A throwaway minimum
migration fixture then exercised canonical `:name` SQL, build-time `$n`
lowering, `bindNamedParameters`, native `pg`, hostile-value parameter separation,
missing-parameter rejection, and explicit rollback on PostgreSQL 16. The
maintained standalone reference additionally passed generated-binding freshness,
four contracts, three negative controls, and four live tests. This proves the
replacement path but does not measure a line-by-line scaffold conversion. No
wall-time/token/retry metric is claimed.
