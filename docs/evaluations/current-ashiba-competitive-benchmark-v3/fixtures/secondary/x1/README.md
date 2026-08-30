# X1 open-ended composition control

X1 is a non-aggregate control. It asks whether a treatment can implement a
bounded report request whose projection, optional join, predicates, and
grouping vary together. It does **not** treat its finite request vocabulary as
an unrestricted report builder, and it does not modify a primary-cell result.

The candidate receives only its arm packet, this assignment, the common
schema/API packet, and its own directory. The runner owns PostgreSQL setup,
the tag data, the three successful report requests, the hostile-value request,
the unknown-vocabulary negative control, final DB-state evidence, and cleanup.

Run a materialised candidate with `runner.mjs`; see `REPRODUCE.md`. Candidate
source, packet, npm cache, role/schema, and evidence directory must be unique
to the cell. The runner records behaviour, treatment review, source SQL/
executed SQL/parameter observations, and the candidate source manifest.
