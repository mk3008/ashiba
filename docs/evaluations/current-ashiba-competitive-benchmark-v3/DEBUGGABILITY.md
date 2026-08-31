# Operational debugging and SQL visibility

Q1 measures a bounded PostgreSQL-centric workflow: complex SQL behavior,
source/executed-SQL trace evidence, runner-collected EXPLAIN, and a behavior
preserving improvement. It includes CTE/window/aggregate/CASE and PostgreSQL
type features in the frozen fixture.

The runner can establish only the listed Q1 evidence contract. It does not
measure production logging, tracing integrations, query-plan quality,
incident-response time, or general database-client ergonomics. A Q1 failure
is not a claim that a treatment cannot debug SQL in practice; a Q1 pass is not
a production observability certification.

For Ashiba, visible canonical SQL is directly inspectable in the treatment.
For other arms, source SQL, builder source, generated SQL, or documented raw
SQL paths must be inspected in each preserved candidate rather than assumed
from product marketing.
