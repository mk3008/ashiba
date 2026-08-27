# Golden Path Migration Experiment

Target migration: canonical SQL → deterministic binding artifact →
`bindNamedParameters` → native `pg` → optional contract → application/live
tests. Existing Golden Path evidence establishes parameter rejection, hostile
values, explicit transaction/rollback, and PostgreSQL contract behavior.

Fresh execution status: **not run**. Dependency installation and dependency-order
CLI build succeeded. Docker daemon access failed (`dockerDesktopLinuxEngine`
pipe missing), so a new real PostgreSQL scaffold-consumer migration could not be
executed. No wall-time/token/retry metric is claimed; no temporary DB/container
was created.
